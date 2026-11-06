import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {projectRoot} from './build.mjs';

const output = path.join(projectRoot, 'dist');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
if (html.includes('@include')) throw new Error('HTML includes were not rendered.');
let checked = 0;

async function reference(value, from) {
  const target = value.split('#')[0].split('?')[0];
  if (!target || /^(?:data:|https?:|node:)/.test(target)) return;
  const file = target.startsWith('/') ? path.join(output, target) : path.resolve(path.dirname(from), target);
  if (!file.startsWith(output + path.sep) || !(await stat(file)).isFile()) {
    throw new Error(`Missing build asset: ${target} in ${path.relative(output, from)}`);
  }
  checked++;
}

async function scan(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!/\.(?:html|css|js)$/.test(entry.name)) continue;
    const text = await readFile(file, 'utf8');
    if (entry.name.endsWith('.html')) {
      for (const match of text.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) await reference(match[1], file);
    }
    if (entry.name.endsWith('.js')) {
      for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) await reference(match[1], file);
      for (const match of text.matchAll(/href="(\/assets\/[^"#]+)(?:#[^"]*)?"/g)) await reference(match[1], file);
    }
    if (entry.name.endsWith('.css')) {
      for (const match of text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) await reference(match[2], file);
    }
  }
}

await scan(output);
console.log(`Build references verified: ${checked} assets and module imports.`);
