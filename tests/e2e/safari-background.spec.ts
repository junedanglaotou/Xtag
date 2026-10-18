import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchExtension } from './browser';
import { fixture } from './fixture';

test('Safari built background page declares UTF-8 and preserves all Chinese labels and errors', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'xtag-safari-background-'));
  let stop: (() => Promise<void>) | undefined;
  try {
    const extension = path.join(directory, 'extension'); const profile = path.join(directory, 'profile');
    await mkdir(profile); await cp('.output/safari-mv2', extension, { recursive: true });
    const safari = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
    expect(safari.background).toEqual({ page: 'background-utf8.html' });
    const script = await readFile(path.join(extension, 'background.js'));
    expect(script.every(byte => byte < 128)).toBe(true);
    // Chromium cannot install MV2. Use an MV3 harness to execute the unmodified Safari
    // HTML/JS as a real extension page, with real runtime messaging and IndexedDB.
    const manifest = JSON.parse(await readFile('.output/chrome-mv3/manifest.json', 'utf8'));
    manifest.background = { service_worker: 'harness.js' };
    await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(path.join(extension, 'harness.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
    const installed = await launchExtension(profile, extension); stop = installed.close;
    const background = await installed.context.newPage();
    await background.goto(`chrome-extension://${installed.extensionId}/${safari.background.page}`);
    expect(await background.evaluate(() => document.characterSet)).toBe('UTF-8');
    await installed.context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    const page = await installed.context.newPage(); await page.goto('https://x.com/home');
    const control = page.locator('xtag-control[data-post-id="101"] button');
    for (const tag of ['有用', '谣言', '没用', '高质']) {
      await control.click(); await page.locator('xtag-overlay').getByRole('menuitemradio', { name: new RegExp(`^${tag}`) }).click();
      await expect(control.locator('span')).toHaveText(tag);
      await page.reload(); await expect(control.locator('span')).toHaveText(tag);
    }
    await page.goto(`chrome-extension://${installed.extensionId}/records.html`);
    await expect(page.locator('.record-top .tag-badge')).toHaveText('高质');
    const invalid = await page.evaluate(async () => {
      const api = (globalThis as unknown as { chrome: { runtime: { id: string; sendMessage: (message: unknown) => Promise<{ ok: boolean; error?: string }> } } }).chrome;
      return api.runtime.sendMessage({ xtag: true, type: 'set', post: { postId: '101', authorHandle: 'alice', authorDisplayName: 'Alice', postUrl: 'https://x.com/alice/status/101', postTextSnippet: '' }, tag: '坏标签' });
    });
    expect(invalid).toEqual({ ok: false, error: '标签无效' });
    await page.getByRole('button', { name: '取消标记' }).click();
    await expect(page.locator('.record')).toHaveCount(0);
    await page.reload(); await expect(page.locator('.record')).toHaveCount(0);
  } finally {
    await stop?.(); const resolved = path.resolve(directory);
    if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('xtag-safari-background-')) throw new Error('Unsafe test cleanup path');
    await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
