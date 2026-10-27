import { defineMiddleware } from 'astro:middleware';
import { haySesion } from './auth.ts';

const PRIVADO = /^\/(admin|api\/admin)(\/|$)/;
const ABIERTO = new Set(['/admin/login']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  if (PRIVADO.test(pathname) && !ABIERTO.has(pathname)) {
    if (!haySesion(ctx.cookies)) {
      return pathname.startsWith('/api/') ? new Response('No autorizado', { status: 401 }) : ctx.redirect('/admin/login');
    }
  }
  // checkOrigin está apagado en astro.config (TLS termina en el túnel): se compara acá con SITE_ORIGIN.
  if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
    const origen = ctx.request.headers.get('origin');
    const permitido = process.env.SITE_ORIGIN ?? ctx.url.origin;
    if (origen !== permitido) return new Response('Origen no permitido', { status: 403 });
  }
  const res = await next();
  if (PRIVADO.test(pathname)) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
});
