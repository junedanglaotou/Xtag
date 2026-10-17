import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
const profile = await mkdtemp(path.join(tmpdir(), 'xtag-probe-'));
const executable = chromium.executablePath();
const extension = path.resolve('.output/chrome-mv3');
const process = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-extension-debugging', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true });
process.stderr.on('data', data => console.log(String(data)));
process.on('error', error => console.log('spawn error:', error.message));
let connected = false;
for (let n = 0; n < 15; n++) {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 5000 });
    console.log('CONNECTED:', browser.version());
    const session = await browser.newBrowserCDPSession();
    console.log('LOAD:', await session.send('Extensions.loadUnpacked', { path: extension }));
    const context = browser.contexts()[0];
    let worker = context.serviceWorkers()[0]; if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 5000 });
    console.log('EXTENSION:', worker.url()); await browser.close(); connected = true; break;
  } catch {}
}
console.log('profile files:', await readdir(profile));
process.kill();
console.log('CDP connected:', connected);
// Keep the disposable profile for diagnostics; it contains no user data.
