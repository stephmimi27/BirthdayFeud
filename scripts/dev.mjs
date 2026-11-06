import http from 'node:http';
import path from 'node:path';
import {readFile, stat} from 'node:fs/promises';
import {watch} from 'node:fs';
import {build, projectRoot} from './build.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const port = Number(args.includes('--port') ? option('--port') : process.env.PORT || 4173);
const host = args.includes('--host') ? option('--host') : '0.0.0.0';
const output = await build();
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
  '.png': 'image/png', '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(output, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(output + path.sep) || !(await stat(file)).isFile()) {
      response.writeHead(404); response.end('Not found'); return;
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
server.listen(port, host, () => console.log(`Birthday Feud: http://${host}:${port}`));

if (!args.includes('--no-watch')) {
  let timer, running = false, dirty = false;
  const rebuild = async () => {
    if (running) { dirty = true; return; }
    running = true;
    try { await build(); }
    catch (error) { console.error(error.message); }
    finally { running = false; if (dirty) { dirty = false; rebuild(); } }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); };
  for (const name of ['src', 'public']) watch(path.join(projectRoot, name), {recursive: true}, schedule);
  watch(path.join(projectRoot, 'index.html'), schedule);
}
