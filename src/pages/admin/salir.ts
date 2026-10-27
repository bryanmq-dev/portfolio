import type { APIRoute } from 'astro';
import { cerrarSesion, csrfValido } from '../../auth.ts';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (csrfValido(cookies, String((await request.formData()).get('csrf')))) cerrarSesion(cookies);
  return redirect('/admin/login');
};
