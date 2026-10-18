import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';
import { createHash } from 'node:crypto';
const root = path.resolve('.');
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
for (const [target, name] of [['chrome-mv3', 'xtag-0.1.3-chrome-edge.zip'], ['firefox-mv2', 'xtag-0.1.3-firefox-unsigned.xpi'], ['safari-mv2', 'xtag-0.1.3-safari-webextension.zip']]) {
  const files = await collect(path.join(root, '.output', target));
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  if (manifest.chrome_url_overrides || manifest.permissions.some(p => p !== 'storage')) throw new Error(`Unexpected permissions / overrides in ${target}`);
  const data = zipSync(files, { level: 9 }); await writeFile(path.join(root, 'dist', name), data);
  hashes.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`);
  console.log(`${name}: ${data.byteLength} bytes`);
}
const source = {};
for (const directory of ['src', 'entrypoints', 'tests', 'scripts', '.github']) Object.assign(source, await collect(path.join(root, directory), `${directory}/`));
for (const file of ['package.json', 'package-lock.json', 'wxt.config.ts', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts', 'README.md', 'COMPATIBILITY.md', 'TEST_REPORT.md', 'PRIVACY.md', 'KNOWN_LIMITATIONS.md', 'POLICY_REVIEW.md', 'SAFARI_TROUBLESHOOTING.md', 'RELEASE_AND_UPDATES.md', '.gitignore']) source[file] = new Uint8Array(await readFile(path.join(root, file)));
const sourceData = zipSync(source, { level: 9 }); await writeFile('dist/xtag-0.1.3-source.zip', sourceData);
hashes.push(`${createHash('sha256').update(sourceData).digest('hex')}  xtag-0.1.3-source.zip`);
await writeFile('dist/SHA256SUMS.txt', hashes.join('\n') + '\n');
