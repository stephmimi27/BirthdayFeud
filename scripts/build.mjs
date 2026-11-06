import {cp, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function renderIncludes(file, ancestors = []) {
  if (ancestors.includes(file)) throw new Error(`Circular HTML include: ${file}`);
  let html = await readFile(file, 'utf8');
  for (const match of [...html.matchAll(/<!--\s*@include\s+([\w/.-]+)\s*-->/g)]) {
    const include = path.resolve(projectRoot, match[1]);
    if (!include.startsWith(projectRoot + path.sep) || !include.endsWith('.html')) {
      throw new Error(`Invalid HTML include: ${match[1]}`);
    }
    html = html.replace(match[0], await renderIncludes(include, [...ancestors, file]));
  }
  return html;
}

async function copyRuntimeFiles(source, destination) {
  await mkdir(destination, {recursive: true});
  for (const entry of await readdir(source, {withFileTypes: true})) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyRuntimeFiles(from, to);
    else if (/\.(?:js|css)$/.test(entry.name)) await cp(from, to);
  }
}

export async function build() {
  const temporary = path.join(projectRoot, '.build-temp');
  const output = path.join(projectRoot, 'dist');
  await rm(temporary, {recursive: true, force: true});
  await mkdir(temporary, {recursive: true});
  await cp(path.join(projectRoot, 'public'), temporary, {recursive: true});
  await copyRuntimeFiles(path.join(projectRoot, 'src'), path.join(temporary, 'src'));
  await writeFile(path.join(temporary, 'index.html'), await renderIncludes(path.join(projectRoot, 'index.html')));
  await rm(output, {recursive: true, force: true});
  await rename(temporary, output);
  console.log('Built dist/ from index.html, src/ and public/.');
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
