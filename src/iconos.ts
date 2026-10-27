import * as si from 'simple-icons';

// Logos de simple-icons (CC0), resueltos en el servidor: la página recibe solo el <path> de cada uno.
type Icono = { title: string; slug: string; hex: string; path: string };
const todos = (Object.values(si) as unknown[]).filter((x): x is Icono => typeof x === 'object' && x !== null && 'path' in x);
const porSlug = new Map(todos.map((i) => [i.slug, i]));
const porTitulo = new Map(todos.map((i) => [i.title.toLowerCase(), i]));

// Nombres que no coinciden con un título de simple-icons.
const ALIAS: Record<string, string> = {
  'claude code': 'claude',
  'skills de agente': 'claude',
  artifacts: 'claude',
  mcp: 'modelcontextprotocol',
  'cloudflare tunnels': 'cloudflare',
  '.net core': 'dotnet',
  '.net webforms': 'dotnet',
  postgres: 'postgresql',
};

export function icono(nombre: string, slug?: string | null): Icono | null {
  const n = nombre.trim().toLowerCase();
  // Sin adivinar si el nombre lleva # o +: "C#" no es "C".
  const adivinado = /[#+]/.test(n) ? undefined : n.replace(/[^a-z0-9]/g, '');
  return (slug && porSlug.get(slug)) || porTitulo.get(n) || porSlug.get(ALIAS[n] ?? adivinado ?? '') || null;
}
