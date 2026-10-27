import type { Entrada, Perfil, Skill } from './contenido.ts';

// Textos y datos estructurados para buscadores. Todo sale del contenido del admin.

/** Markdown → texto plano de hasta `max` caracteres, cortado en palabra. */
export function resumir(md: string, max = 158): string {
  const t = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '') // viñetas de lista, no los guiones dentro del texto
    .replace(/[#*_`>~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length <= max ? t : `${t.slice(0, t.lastIndexOf(' ', max - 1))}…`;
}

const abs = (ruta: string, sitio: URL) => new URL(ruta, sitio).href;

export function persona(yo: Perfil, skills: Skill[], sitio: URL) {
  return {
    '@type': 'Person',
    '@id': abs('/#persona', sitio),
    name: yo.nombre,
    alternateName: 'bryanmq-dev',
    url: abs('/', sitio),
    ...(yo.foto && { image: abs(yo.foto, sitio) }),
    ...(yo.titular && { jobTitle: yo.titular.split(/[·|]/)[0].trim(), description: yo.titular }),
    ...(yo.correo && { email: `mailto:${yo.correo}` }),
    sameAs: yo.enlaces.map((l) => l.url),
    alumniOf: yo.estudios.filter((e) => e.lugar).map((e) => ({ '@type': 'CollegeOrUniversity', name: e.lugar })),
    knowsAbout: skills.map((s) => s.nombre),
  };
}

export function grafoLd(yo: Perfil, skills: Skill[], sitio: URL, extra: object[] = []) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': abs('/#sitio', sitio), url: abs('/', sitio), name: 'bryanmq-dev', inLanguage: 'es', publisher: { '@id': abs('/#persona', sitio) } },
      persona(yo, skills, sitio),
      ...extra,
    ],
  };
}

export const migas = (sitio: URL, pasos: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [['Inicio', '/'] as [string, string], ...pasos].map(([nombre, ruta], i) => ({ '@type': 'ListItem', position: i + 1, name: nombre, item: abs(ruta, sitio) })),
});

export function obra(e: Entrada, sitio: URL, ruta: string) {
  return {
    '@type': 'CreativeWork',
    '@id': abs(`${ruta}#obra`, sitio),
    name: e.titulo,
    description: e.resumen,
    url: abs(ruta, sitio),
    author: { '@id': abs('/#persona', sitio) },
    ...(e.inicio && { dateCreated: e.inicio }),
    ...(e.portada && { image: abs(e.portada, sitio) }),
    ...(e.tecnologias.length && { keywords: e.tecnologias.join(', ') }),
    ...(e.cliente && { sourceOrganization: { '@type': 'Organization', name: e.cliente } }),
  };
}
