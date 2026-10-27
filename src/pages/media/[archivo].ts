import type { APIRoute } from 'astro';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { CARPETA, MIME } from '../../media.ts';

// Nombres aleatorios e inmutables: se cachean para siempre. Range para que el <video> pueda adelantar (Safari lo exige).
export const GET: APIRoute = async ({ params, request }) => {
  const m = /^([a-f0-9]{24})\.(\w+)$/.exec(params.archivo ?? '');
  if (!m || !MIME[m[2]]) return new Response(null, { status: 404 });
  const ruta = join(CARPETA, m[0]);
  const info = await stat(ruta).catch(() => null);
  if (!info) return new Response(null, { status: 404 });

  const base = {
    'Content-Type': MIME[m[2]],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  };
  const rango = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (rango && (rango[1] || rango[2])) {
    const ini = rango[1] ? Number(rango[1]) : info.size - Number(rango[2]);
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), info.size - 1) : info.size - 1;
    if (ini < 0 || ini > fin) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    return new Response(Readable.toWeb(createReadStream(ruta, { start: ini, end: fin })) as ReadableStream, {
      status: 206,
      headers: { ...base, 'Content-Length': String(fin - ini + 1), 'Content-Range': `bytes ${ini}-${fin}/${info.size}` },
    });
  }
  return new Response(Readable.toWeb(createReadStream(ruta)) as ReadableStream, {
    headers: { ...base, 'Content-Length': String(info.size) },
  });
};
