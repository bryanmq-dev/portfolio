// Las secciones del grafo, en el orden en que se reparten por la elipse (índice = hub).
export const SECCIONES = [
  { id: 'sobre-mi', nombre: 'Sobre mí', icono: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>' },
  { id: 'proyectos', nombre: 'Proyectos', icono: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>' },
  { id: 'experiencia', nombre: 'Experiencia', icono: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>' },
  { id: 'soft-skills', nombre: 'Soft skills', icono: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.7 4 2.8 4 6"/>' },
  { id: 'skills', nombre: 'Skills', icono: '<path d="m4 20 9-9M11 7l4-4 6 6-4 4z"/>' },
] as const;
export type SeccionId = (typeof SECCIONES)[number]['id'];

/** Secciones que se vuelven dock; su contenido son entradas de este tipo. */
export const DOCK = { proyectos: 'proyecto', experiencia: 'experiencia', 'soft-skills': 'evento' } as const;
