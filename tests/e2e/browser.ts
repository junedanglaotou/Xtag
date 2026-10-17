import { chromium, type BrowserContext } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export async function launchExtension(profile: string): Promise<{ context: BrowserContext; extensionId: string; close: () => Promise<void> }> {
  const extension = path.resolve('.output/chrome-mv3');
  const args = [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`];
  if (process.platform !== 'win32') {
    const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args, viewport: { width: 1280, height: 900 } });
    let worker = context.serviceWorkers()[0]; if (!worker) worker = await context.waitForEvent('serviceworker');
    return { context, extensionId: new URL(worker.url()).host, close: () => context.close() };
  }
  // This Windows host does not answer Playwright's inherited debugging pipe. A loopback CDP
  // port works; the browser still uses a fresh disposable profile and the real extension.
  await unlink(path.join(profile, 'DevToolsActivePort')).catch(() => {});
  const child = spawn(process.env.XTAG_BROWSER || chromium.executablePath(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--enable-unsafe-extension-debugging', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true });
  let error: Error | undefined; child.on('error', e => { error = e; });
  try {
    let port: string | undefined;
    for (let i = 0; i < 100; i++) {
      if (error) throw error;
      try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; if (port) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!port) throw new Error('Chromium did not expose its local debugging port');
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 10000 });
    const session = await browser.newBrowserCDPSession();
    const loaded = await session.send('Extensions.loadUnpacked', { path: extension });
    const context = browser.contexts()[0]!;
    return { context, extensionId: loaded.id, close: async () => { await browser.close(); child.kill(); await new Promise(resolve => setTimeout(resolve, 300)); } };
  } catch (e) { child.kill(); throw e; }
}
