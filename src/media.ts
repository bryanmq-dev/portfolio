import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Fotos y videos del admin en el volumen `portfolio-media` (/app/data). Se sirven por /media/[archivo].
export const CARPETA = join(process.env.DATA_DIR ?? 'data', 'media');
export const LIMITE = { imagen: 15 * 1024 ** 2, video: 300 * 1024 ** 2 };

const MP4 = ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '];
type Tipo = { ext: string; tipo: 'imagen' | 'video'; mime: string };
export const MIME: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm',
};

/** Tipo real por los bytes iniciales (de hb-webpage/src/server/media.ts): no se confía en el nombre ni en Content-Type. */
export function sniff(b: Uint8Array): Tipo | null {
  if (b.length < 12) return null;
  const ascii = (de: number, a: number) => String.fromCharCode(...b.subarray(de, a));
  const t = (ext: string): Tipo => ({ ext, tipo: ext === 'mp4' || ext === 'webm' ? 'video' : 'imagen', mime: MIME[ext] });
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return t('jpg');
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return t('png');
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return t('webp');
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return t('webm');
  if (ascii(4, 8) === 'ftyp') {
    const marca = ascii(8, 12);
    if (marca === 'avif' || marca === 'avis') return t('avif');
    if (MP4.includes(marca)) return t('mp4');
  }
  return null;
}

export class ErrorSubida extends Error {
  constructor(msg: string, public status: number) {
    super(msg);
  }
}

/**
 * Escribe el cuerpo de la petición a disco cortando apenas pasa el límite (no después),
 * verifica el tipo por sus bytes y devuelve la URL pública.
 */
export async function guardar(cuerpo: ReadableStream<Uint8Array> | null): Promise<{ url: string; tipo: Tipo['tipo'] }> {
  if (!cuerpo) throw new ErrorSubida('Archivo vacío', 400);
  await mkdir(CARPETA, { recursive: true });
  const nombre = randomBytes(12).toString('hex');
  const tmp = join(CARPETA, `${nombre}.part`);
  let cabeza = new Uint8Array(0);
  let total = 0;
  try {
    await pipeline(
      Readable.fromWeb(cuerpo as any),
      async function* (fuente) {
        for await (const trozo of fuente as AsyncIterable<Buffer>) {
          if (cabeza.length < 16) cabeza = Buffer.concat([cabeza, trozo]).subarray(0, 16);
          total += trozo.length;
          if (total > LIMITE.video) throw new ErrorSubida('Archivo demasiado grande', 413);
          yield trozo;
        }
      },
      createWriteStream(tmp, { mode: 0o600 })
    );
    const t = sniff(cabeza);
    if (!t) throw new ErrorSubida('Formato no admitido (JPG, PNG, WebP, AVIF, MP4, WebM)', 415);
    if (t.tipo === 'imagen' && total > LIMITE.imagen) throw new ErrorSubida('Imagen demasiado grande', 413);
    await rename(tmp, join(CARPETA, `${nombre}.${t.ext}`));
    return { url: `/media/${nombre}.${t.ext}`, tipo: t.tipo };
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
}
