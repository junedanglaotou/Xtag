import { readFile, readdir } from 'node:fs/promises';
const roots = ['src', 'entrypoints', 'tests', 'scripts', '.github'];
const entries = [];
async function collect(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = `${dir}/${item.name}`;
    if (item.isDirectory()) await collect(name);
    else entries.push({ path: name, mode: '100644', type: 'blob', content: await readFile(name, 'utf8') });
  }
}
for (const dir of roots) await collect(dir);
for (const name of ['package.json', 'package-lock.json', 'wxt.config.ts', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts', 'README.md', 'COMPATIBILITY.md', 'TEST_REPORT.md', 'PRIVACY.md', 'KNOWN_LIMITATIONS.md', 'POLICY_REVIEW.md', 'SAFARI_TROUBLESHOOTING.md', '.gitignore']) entries.push({ path: name, mode: '100644', type: 'blob', content: (await readFile(name, 'utf8')).replace(/^\uFEFF/, '') });
process.stdout.write(JSON.stringify(entries));
