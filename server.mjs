// Servidor de producción: el handler de Astro, con los estáticos comprimidos delante.
//
// El adaptador de Node sirve los archivos crudos y con max-age=0. three.js pesa
// ~600 KB de JS: crudo son segundos de pantalla quieta en un 4G flojo. Aquí se
// comprimen una vez al arrancar (brotli 11, gzip 9 de respaldo) y se sirven desde
// memoria; los de /_astro llevan hash en el nombre, así que se cachean para siempre.
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

// El entry de Astro arranca su propio servidor al importarse; se apaga para montar su
// handler (estáticos + páginas) detrás de este. Import dinámico: el estático se
// evaluaría antes de fijar la variable.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const RAIZ = fileURLToPath(new URL('./dist/client/', import.meta.url));
const TIPOS = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
};

function* recorrer(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* recorrer(p);
    else yield p;
  }
}

const archivos = new Map();
for (const ruta of recorrer(RAIZ)) {
  const tipo = TIPOS[extname(ruta)];
  if (!tipo) continue; // imágenes y fuentes ya vienen comprimidas: las sirve Astro
  const crudo = readFileSync(ruta);
  archivos.set('/' + relative(RAIZ, ruta).split('\\').join('/'), {
    tipo,
    br: brotliCompressSync(crudo, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
    gzip: gzipSync(crudo, { level: 9 }),
  });
}

const puerto = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

createServer((req, res) => {
  const ruta = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const f = (req.method === 'GET' || req.method === 'HEAD') && archivos.get(ruta);
  const acepta = String(req.headers['accept-encoding'] ?? '');
  const enc = f && (/\bbr\b/.test(acepta) ? 'br' : /\bgzip\b/.test(acepta) ? 'gzip' : null);
  if (!enc) return handler(req, res);

  res.writeHead(200, {
    'Content-Type': f.tipo,
    'Content-Encoding': enc,
    'Content-Length': f[enc].length,
    Vary: 'Accept-Encoding',
    'Cache-Control': ruta.startsWith('/_astro/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  });
  res.end(req.method === 'HEAD' ? undefined : f[enc]);
}).listen(puerto, host, () =>
  console.log(`Portafolio en http://${host}:${puerto} (${archivos.size} estáticos comprimidos)`)
);
