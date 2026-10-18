import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { createHash } from 'node:crypto';
await import('./check-builds.mjs');
const root = path.resolve('.');
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
async function collect(directory, prefix = '') {
  const files = {};
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const key = `${prefix}${item.name}`;
    if (item.isDirectory()) Object.assign(files, await collect(path.join(directory, item.name), `${key}/`));
    else files[key] = new Uint8Array(await readFile(path.join(directory, item.name)));
  }
  return files;
}
await mkdir('dist', { recursive: true });
const hashes = [];
for (const [target, suffix] of [['chrome-mv3', 'chrome-edge.zip'], ['firefox-mv2', 'firefox-unsigned.xpi'], ['safari-mv2', 'safari-webextension.zip']]) {
  const name = `xtag-${version}-${suffix}`;
  const files = await collect(path.join(root, '.output', target));
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  if (manifest.chrome_url_overrides || manifest.permissions.some(p => p !== 'storage')) throw new Error(`Unexpected permissions / overrides in ${target}`);
  const data = zipSync(files, { level: 9 }); await writeFile(path.join(root, 'dist', name), data);
  hashes.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`);
  console.log(`${name}: ${data.byteLength} bytes`);
}
const source = {};
for (const directory of ['src', 'entrypoints', 'tests', 'scripts', '.github']) Object.assign(source, await collect(path.join(root, directory), `${directory}/`));
for (const file of ['package.json', 'package-lock.json', 'wxt.config.ts', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts', 'README.md', 'COMPATIBILITY.md', 'TEST_REPORT.md', 'PRIVACY.md', 'KNOWN_LIMITATIONS.md', 'POLICY_REVIEW.md', 'SAFARI_TROUBLESHOOTING.md', 'RELEASE_AND_UPDATES.md', 'SAFARI_DEVELOPER_ID.md', '.gitignore']) source[file] = new Uint8Array(await readFile(path.join(root, file)));
const sourceData = zipSync(source, { level: 9 }); await writeFile(`dist/xtag-${version}-source.zip`, sourceData);
hashes.push(`${createHash('sha256').update(sourceData).digest('hex')}  xtag-${version}-source.zip`);
await writeFile('dist/SHA256SUMS.txt', hashes.join('\n') + '\n');
