import type { APIRoute } from 'astro';
import { csrfValido } from '../../../auth.ts';
import { ErrorSubida, guardar } from '../../../media.ts';

// El navegador manda el archivo crudo (PUT con el File como cuerpo): sin multipart, se escribe a disco en streaming.
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!csrfValido(cookies, request.headers.get('x-csrf'))) return Response.json({ error: 'CSRF' }, { status: 403 });
  try {
    return Response.json(await guardar(request.body));
  } catch (e) {
    if (e instanceof ErrorSubida) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
};
