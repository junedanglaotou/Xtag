import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchExtension } from './browser';
import { fixture } from './fixture';

test('updating the same installed extension preserves legacy records, identity and timestamps', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'xtag-upgrade-'));
  const profile = path.join(directory, 'profile');
  const extension = path.join(directory, 'extension');
  let stop: (() => Promise<void>) | undefined;
  try {
    await mkdir(profile); await mkdir(extension);
    const production = path.resolve('.output/chrome-mv3');
    const manifest = JSON.parse(await readFile(path.join(production, 'manifest.json'), 'utf8'));
    // An explicit legacy-schema fixture, not the historical 0.1.2 production binary.
    await writeFile(path.join(extension, 'manifest.json'), JSON.stringify({ ...manifest, version: '0.1.2', background: { service_worker: 'legacy.js' }, content_scripts: [] }));
    await writeFile(path.join(extension, 'legacy.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
    let installed = await launchExtension(profile, extension); stop = installed.close;
    const originalId = installed.extensionId;
    let worker = installed.context.serviceWorkers().find(w => new URL(w.url()).host === originalId);
    if (!worker) worker = await installed.context.waitForEvent('serviceworker', { predicate: w => new URL(w.url()).host === originalId });
    const records = [
      { postId: '101', authorHandle: 'alice', authorDisplayName: 'Alice', postUrl: 'https://x.com/alice/status/101', postTextSnippet: '保留升级前的判断', tag: '未知', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' },
      { postId: '102', authorHandle: 'alice', authorDisplayName: 'Alice', postUrl: 'https://x.com/alice/status/102', postTextSnippet: '另一条历史记录', tag: '高质', createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' },
    ];
    await worker.evaluate(async records => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('xtag-v1', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('marks', { keyPath: 'postId' });
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('marks', 'readwrite');
        for (const record of records) tx.objectStore('marks').put(record);
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
      });
      db.close();
    }, records);
    await stop(); stop = undefined;
    // Replace files in place. Never uninstall or switch the extension directory/profile.
    await cp(production, extension, { recursive: true });
    installed = await launchExtension(profile, extension); stop = installed.close;
    expect(installed.extensionId).toBe(originalId);
    await installed.context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    let page = await installed.context.newPage(); await page.goto('https://x.com/home');
    await expect(page.locator('xtag-control[data-post-id="101"] button span')).toHaveText('没用');
    await expect(page.locator('xtag-control[data-post-id="102"] button span')).toHaveText('高质');
    await page.goto('https://x.com/alice');
    await expect(page.locator('xtag-profile button')).toContainText('没用 1');
    await expect(page.locator('xtag-profile button')).toContainText('高质 1');
    await page.goto(`chrome-extension://${originalId}/records.html`);
    await expect(page.locator('.record')).toHaveCount(2);
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: '导出全部 JSON' }).click();
    const file = await downloaded;
    const backup = JSON.parse(await readFile((await file.path())!, 'utf8'));
    expect(backup.records).toEqual([{ ...records[0], tag: '没用' }, records[1]]);
    await stop(); stop = undefined;
    installed = await launchExtension(profile, extension); stop = installed.close;
    expect(installed.extensionId).toBe(originalId);
    page = await installed.context.newPage(); await page.goto(`chrome-extension://${originalId}/records.html`);
    await expect(page.locator('.record')).toHaveCount(2);
  } finally {
    await stop?.();
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('xtag-upgrade-')) throw new Error('Unsafe test cleanup path');
    await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
