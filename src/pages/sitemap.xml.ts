import type { APIRoute } from 'astro';
import { CATEGORIAS, entradas, skills } from '../contenido.ts';
import { DOCK, SECCIONES } from '../secciones.ts';

// Todas las URLs públicas, desde la base: lo que se publica en el admin aparece solo.
export const GET: APIRoute = async ({ site }) => {
  const sitio = site ?? new URL('https://bryanmq.com');
  const rutas = ['/', '/contacto', ...SECCIONES.map((s) => `/${s.id}`)];
  for (const [sec, tipo] of Object.entries(DOCK)) for (const e of await entradas(tipo)) rutas.push(`/${sec}/${e.slug}`);
  const usadas = new Set((await skills()).map((s) => s.categoria));
  for (const c of Object.keys(CATEGORIAS)) if (usadas.has(c as keyof typeof CATEGORIAS)) rutas.push(`/skills/${c}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `  <url><loc>${new URL(r, sitio).href}</loc>${r === '/' ? '<priority>1.0</priority>' : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
