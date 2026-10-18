import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fixture, tweet } from './fixture';
import { launchExtension } from './browser';
let context: BrowserContext; let page: Page; let directory: string; let extensionId: string;
let stopBrowser: (() => Promise<void>) | undefined;
const control = (id: string) => page.locator(`xtag-control[data-post-id="${id}"] button`);
const menu = () => page.locator('xtag-overlay [role="menu"]');
async function choose(id: string, tag: string) {
  await control(id).click(); await menu().getByRole('menuitemradio', { name: new RegExp(`^${tag}`) }).click();
  await expect(control(id).locator('span')).toHaveText(tag);
}
test.beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'xtag-e2e-'));
  const launched = await launchExtension(directory); context = launched.context; stopBrowser = launched.close; extensionId = launched.extensionId;
  await context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  page = await context.newPage(); await page.goto('https://x.com/home');
  await expect(page.locator('xtag-control')).toHaveCount(4);
});
test.afterEach(async () => {
  await stopBrowser?.(); stopBrowser = undefined;
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('xtag-e2e-')) throw new Error('Unsafe test cleanup path');
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('new posts are blank, dropdown opens, selection changes only the current post', async () => {
  await expect(control('101').locator('span')).toHaveText('');
  await control('101').click(); await expect(menu()).toBeVisible();
  await expect(menu().getByRole('menuitemradio', { name: '有用 0次' })).toBeVisible();
  await menu().getByRole('menuitemradio', { name: '有用 0次' }).click();
  await expect(control('101').locator('span')).toHaveText('有用');
  await expect(control('102').locator('span')).toHaveText('');
  await expect(menu()).not.toBeVisible();
});
test('same author posts stay independent, counts isolate authors, edit and cancel recompute', async () => {
  await choose('101', '有用'); await choose('102', '有用'); await choose('201', '谣言');
  await control('101').click(); await expect(menu().getByRole('menuitemradio', { name: '有用 2次' })).toBeVisible();
  await menu().getByRole('menuitemradio', { name: '谣言 0次' }).click();
  await expect(control('101').locator('span')).toHaveText('谣言');
  await control('101').click(); await expect(menu().getByRole('menuitemradio', { name: '有用 1次' })).toBeVisible();
  await menu().getByRole('menuitemradio', { name: '谣言 1次' }).click();
  await expect(control('101').locator('span')).toHaveText('');
  await control('102').click(); await expect(menu().getByRole('menuitemradio', { name: '谣言 0次' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(control('102')).toBeFocused();
});
test('marks survive refresh and full browser restart', async () => {
  await choose('101', '高质'); await page.reload(); await expect(control('101').locator('span')).toHaveText('高质');
  await stopBrowser?.();
  const launched = await launchExtension(directory); context = launched.context; stopBrowser = launched.close;
  await context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  page = await context.newPage(); await page.goto('https://x.com/home');
  await expect(control('101').locator('span')).toHaveText('高质');
});
test('infinite insertion is idempotent, recycled and removed nodes are cleaned up', async () => {
  await choose('101', '有用');
  await page.locator('#timeline').evaluate((el, html) => el.insertAdjacentHTML('beforeend', html), Array.from({ length: 70 }, (_, i) => tweet(String(400 + i))).join(''));
  await expect(page.locator('xtag-control')).toHaveCount(74);
  await page.locator('[data-post="101"]').evaluate((el, html) => { el.innerHTML = html; }, tweet('888', 'ellen').replace(/^<article[^>]*>|<\/article>$/g, ''));
  await expect(control('888').locator('span')).toHaveText(''); await expect(control('101')).toHaveCount(0);
  await page.locator('[data-post="102"]').evaluate(el => el.remove());
  await expect(page.locator('xtag-control')).toHaveCount(73);
  await page.waitForTimeout(350); await expect(page.locator('xtag-control')).toHaveCount(73);
  await expect(page.locator('xtag-control[data-post-id="999"]')).toHaveCount(0);
});
test('profile summary, history filter/search/sort, original link and record editing', async () => {
  await choose('101', '有用'); await choose('102', '高质'); await choose('201', '谣言');
  await page.goto('https://x.com/alice');
  const profile = page.locator('xtag-profile button'); await expect(profile).toContainText('有用 1'); await expect(profile).toContainText('谣言 0'); await profile.click();
  const dialog = page.locator('xtag-overlay dialog'); await expect(dialog).toBeVisible();
  await expect(dialog.locator('.record')).toHaveCount(2);
  await dialog.getByRole('combobox', { name: '按标签筛选', exact: true }).selectOption('有用'); await expect(dialog.locator('.record')).toHaveCount(1);
  await expect(dialog.getByRole('link', { name: '查看原帖' })).toHaveAttribute('href', 'https://x.com/alice/status/101');
  const [original] = await Promise.all([context.waitForEvent('page'), dialog.getByRole('link', { name: '查看原帖' }).click()]);
  await original.waitForLoadState(); expect(original.url()).toBe('https://x.com/alice/status/101'); await original.close();
  await dialog.getByRole('combobox', { name: '按标签筛选', exact: true }).selectOption('');
  await dialog.getByRole('searchbox').fill('102'); await expect(dialog.locator('.record')).toHaveCount(1);
  await dialog.getByRole('combobox', { name: '修改帖子 102 的标签' }).selectOption('没用'); await expect(dialog.locator('.record-top')).toContainText('没用');
  await dialog.getByRole('button', { name: '取消标记' }).click(); await expect(dialog.locator('.record')).toHaveCount(0);
  await dialog.getByRole('searchbox').clear(); await dialog.getByRole('combobox', { name: '按日期排序' }).selectOption('asc');
  await expect(dialog.locator('.record')).toHaveCount(1); await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
});
test('JSON backup export and validated merge import work in extension history', async () => {
  await choose('101', '有用');
  await page.goto(`chrome-extension://${extensionId}/records.html`);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出全部 JSON' }).click();
  const artifact = await download; expect(artifact.suggestedFilename()).toMatch(/^xtag-backup-.*\.json$/);
  const backup = { schemaVersion: 1, records: [{ postId: '701', authorHandle: 'zoe', authorDisplayName: '<script>alert(1)</script>', postUrl: 'https://x.com/zoe/status/701', postTextSnippet: '<img src=x onerror=alert(1)>', tag: '没用', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }] };
  await page.getByLabel('选择 JSON 备份').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('.record')).toHaveCount(2); await expect(page.locator('.record img')).toHaveCount(0);
  await page.getByLabel('选择 JSON 备份').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999,"records":[]}') });
  await expect(page.getByRole('status')).toContainText('导入失败'); await expect(page.locator('.record')).toHaveCount(2);
});
for (const mode of [{ name: 'mobile narrow', width: 390, height: 844, dark: true }, { name: 'desktop site layout', width: 980, height: 800, dark: false }]) {
  test(`${mode.name}: touch targets, no horizontal overflow and unclipped dropdown`, async () => {
    await page.setViewportSize({ width: mode.width, height: mode.height }); await page.emulateMedia({ colorScheme: mode.dark ? 'dark' : 'light' }); await page.reload();
    const box = await control('101').boundingBox(); expect(box).not.toBeNull(); if (mode.width < 600) expect(box!.height).toBeGreaterThanOrEqual(40);
    await control('101').click(); const menuBox = await menu().boundingBox(); expect(menuBox!.x).toBeGreaterThanOrEqual(0); expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(mode.width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
    await page.screenshot({ path: `test-results/${mode.name.replaceAll(' ', '-')}.png`, fullPage: true });
    await menu().getByRole('menuitemradio', { name: '没用 0次' }).click(); await expect(control('101').locator('span')).toHaveText('没用');
  });
}
test('SPA navigation and back/forward reinject profile without duplicates', async () => {
  await page.evaluate(() => { history.pushState({}, '', '/alice'); document.body.append(document.createElement('div')); });
  await expect(page.locator('xtag-profile')).toHaveCount(1);
  await page.evaluate(() => { history.pushState({}, '', '/search?q=notes'); document.body.append(document.createElement('div')); });
  await expect(page.locator('xtag-profile')).toHaveCount(0);
  await page.goBack(); await expect(page.locator('xtag-profile')).toHaveCount(1);
  await page.goForward(); await expect(page.locator('xtag-profile')).toHaveCount(0); await expect(page.locator('xtag-control')).toHaveCount(4);
});
test('cross-tab writes update all views without lost records', async () => {
  const second = await context.newPage(); await second.goto('https://x.com/home');
  await choose('101', '有用'); await expect(second.locator('xtag-control[data-post-id="101"] button span')).toHaveText('有用');
  await second.locator('xtag-control[data-post-id="102"] button').click();
  await second.locator('xtag-overlay').getByRole('menuitemradio', { name: '高质 0次' }).click();
  await expect(control('102').locator('span')).toHaveText('高质');
});
test('recycled post cannot receive a stale menu selection before the observer runs', async () => {
  await control('101').click();
  await page.evaluate(() => {
    const article = document.querySelector('[data-post="101"]')!;
    article.querySelector('a[href="/alice/status/101"]')!.setAttribute('href', '/ellen/status/888');
    const host = document.querySelector('xtag-overlay')!;
    (host.shadowRoot!.querySelector('[role="menuitemradio"]') as HTMLButtonElement).click();
  });
  await expect(control('888').locator('span')).toHaveText('');
  await page.goto(`chrome-extension://${extensionId}/records.html`);
  await expect(page.locator('.record')).toHaveCount(0);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`label backgrounds are cyan, red, yellow and blue with equal text colors in ${scheme} mode`, async () => {
    await page.emulateMedia({ colorScheme: scheme }); await page.reload();
    const textColor = await control('101').evaluate(el => getComputedStyle(el).color);
    const cases = [
      { id: '101', tag: '有用', background: 'rgba(6, 182, 212, 0.24)' },
      { id: '102', tag: '谣言', background: 'rgba(239, 68, 68, 0.24)' },
      { id: '201', tag: '没用', background: 'rgba(250, 204, 21, 0.24)' },
      { id: '301', tag: '高质', background: 'rgba(59, 130, 246, 0.24)' },
    ];
    for (const item of cases) {
      await choose(item.id, item.tag);
      await expect(control(item.id)).toHaveCSS('background-color', item.background);
      await expect(control(item.id)).toHaveCSS('color', textColor);
    }
    await control('101').click();
    const menuColor = await menu().getByRole('menuitemradio').first().evaluate(el => getComputedStyle(el).color);
    for (const item of cases) {
      const option = menu().getByRole('menuitemradio', { name: new RegExp(`^${item.tag}`) });
      await expect(option).toHaveCSS('background-color', item.background);
      await expect(option).toHaveCSS('color', menuColor);
    }
    await expect(menu().getByRole('menuitemradio', { name: /^未知/ })).toHaveCount(0);
    await page.screenshot({ path: `test-results/tag-highlights-${scheme}.png`, fullPage: true });
    await page.keyboard.press('Escape'); await page.goto('https://x.com/alice');
    for (const item of cases) await expect(page.locator(`xtag-profile .tag-badge[data-tag="${item.tag}"]`)).toHaveCSS('background-color', item.background);
    await page.locator('xtag-profile button').click();
    const dialog = page.locator('xtag-overlay dialog'); await expect(dialog.locator('.record')).toHaveCount(2);
    const statColor = await dialog.locator('.stat').first().evaluate(el => getComputedStyle(el).color);
    for (const item of cases) {
      await expect(dialog.locator(`.stat[data-tag="${item.tag}"]`)).toHaveCSS('background-color', item.background);
      await expect(dialog.locator(`.stat[data-tag="${item.tag}"]`)).toHaveCSS('color', statColor);
    }
    await expect(dialog.locator('.record-top .tag-badge[data-tag="有用"]')).toHaveCSS('background-color', cases[0]!.background);
    await page.screenshot({ path: `test-results/history-highlights-${scheme}.png`, fullPage: true });
  });
}

test('old unknown backups display, filter, export and cancel as the yellow useless label', async () => {
  await page.goto(`chrome-extension://${extensionId}/records.html`);
  const record = { postId: '101', authorHandle: 'alice', authorDisplayName: 'Alice', postUrl: 'https://x.com/alice/status/101', postTextSnippet: 'An older personal note', tag: '未知', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' };
  await page.getByLabel('选择 JSON 备份').setInputFiles({ name: 'old-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, records: [record] })) });
  await expect(page.locator('.record')).toHaveCount(1);
  await page.getByRole('combobox', { name: '按标签筛选', exact: true }).selectOption('没用');
  await expect(page.locator('.record-top .tag-badge')).toHaveText('没用');
  await expect(page.locator('.record-top .tag-badge')).toHaveCSS('background-color', 'rgba(250, 204, 21, 0.24)');
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: '导出全部 JSON' }).click();
  const file = await downloaded; const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported.records).toEqual([{ ...record, tag: '没用' }]);
  await page.goto('https://x.com/home'); await expect(control('101').locator('span')).toHaveText('没用');
  await control('101').click(); await menu().getByRole('menuitemradio', { name: '没用 1次' }).click();
  await expect(control('101').locator('span')).toHaveText('');
  await expect(control('101')).not.toHaveAttribute('data-tag', /.+/);
});
