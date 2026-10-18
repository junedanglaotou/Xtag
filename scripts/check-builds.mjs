import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const targets = { chrome: 'chrome-mv3', firefox: 'firefox-mv2', safari: 'safari-mv2' };
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(targets)) {
  assert(targets[name], `Unknown target: ${name}`);
  const root = path.resolve('.output', targets[name]);
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.chrome_url_overrides, undefined);
  if (manifest.manifest_version === 2) {
    assert.equal(manifest.background.page, 'background-utf8.html');
    assert.equal(manifest.background.scripts, undefined);
    const html = await readFile(path.join(root, manifest.background.page), 'utf8');
    assert.match(html, /<meta charset="utf-8">/i);
    assert(html.indexOf('<meta') < html.indexOf('<script'));
    assert.match(html, /<script src="background\.js"><\/script>/);
  }
  const script = await readFile(path.join(root, 'background.js'));
  assert(script.every(byte => byte < 128), `${name}: background.js must be ASCII-safe`);
  console.log(`${name}: background encoding and permissions verified`);
}
