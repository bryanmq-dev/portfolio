import type { APIRoute } from 'astro';
import { guardarSolicitud, solicitudDeForm } from '../../contenido.ts';
import { avisarSolicitud } from '../../correo.ts';

// Público. El middleware ya exige Origin = SITE_ORIGIN en todo POST (otro sitio no puede enviar por ti).
// ponytail: límite en memoria por IP (una sola instancia); a la base si algún día hay réplicas.
const envios = new Map<string, number[]>();
const MAX_POR_HORA = 5;

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const json = request.headers.get('accept')?.includes('application/json');
  const responder = (ok: boolean, error?: string, status = 200) =>
    json ? Response.json(ok ? { ok } : { error }, { status }) : redirect(ok ? '/contacto?enviado=1' : `/contacto?error=${encodeURIComponent(error!)}`);

  const ip = request.headers.get('cf-connecting-ip') ?? clientAddress;
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < 3600_000);
  if (recientes.length >= MAX_POR_HORA) return responder(false, 'Demasiados envíos seguidos. Intenta en un rato.', 429);

  const f = await request.formData();
  // Campo trampa: invisible para personas; si llega lleno es un bot. Se le responde "ok" y no se guarda.
  if (String(f.get('web') ?? '')) return responder(true);
  try {
    const s = solicitudDeForm(f);
    await guardarSolicitud(s, ip);
    void avisarSolicitud(s); // en segundo plano: el SMTP puede tardar y la solicitud ya está guardada
  } catch (e) {
    return responder(false, (e as Error).message, 400);
  }
  envios.set(ip, [...recientes, ahora]);
  return responder(true);
};
