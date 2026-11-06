import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {projectRoot} from './build.mjs';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (/\.(?:m?js)$/.test(entry.name)) result.push(file);
  }
  return result;
}

const sources = [...await files(path.join(projectRoot, 'src')), ...await files(path.join(projectRoot, 'scripts'))];
for (const file of sources) {
  const check = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit'});
  if (check.status !== 0) process.exit(check.status || 1);
}
console.log(`JavaScript syntax checked: ${sources.length} files.`);
