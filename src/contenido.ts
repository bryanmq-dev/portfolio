import { db } from './db.ts';

export type Tipo = 'proyecto' | 'experiencia' | 'evento';
export type Media = { url: string; tipo: 'imagen' | 'video'; alt: string };
export type Entrada = {
  id: number;
  tipo: Tipo;
  slug: string;
  titulo: string;
  resumen: string;
  cuerpo_md: string;
  cliente: string | null;
  rol: string | null;
  inicio: string | null;
  fin: string | null;
  tecnologias: string[];
  ia: { herramienta: string; uso: string }[];
  media: Media[];
  portada: string | null; // url de una imagen de `media`: la foto de la tarjeta
  enlace: string | null;
  orden: number;
  puntos: number;
  publicado: boolean;
  demo: boolean;
};
export type Perfil = {
  nombre: string;
  titular: string;
  bio_md: string;
  estudios: { titulo: string; lugar: string; desde: string | null; hasta: string | null }[];
  enlaces: { nombre: string; url: string }[];
  correo: string | null;
  foto: string | null;
  silueta: string | null;
};
export type Skill = { id: number; nombre: string; categoria: 'tecnica' | 'negocio' | 'herramienta' | 'ia'; icono: string | null; orden: number; demo: boolean };

export const TIPOS: Tipo[] = ['proyecto', 'experiencia', 'evento'];
export const CATEGORIAS = { tecnica: 'Técnicas', herramienta: 'Herramientas y cloud', ia: 'IA', negocio: 'Negocio y liderazgo' } as const;

export const perfil = async () => (await db.get<Perfil>('SELECT * FROM perfil WHERE id = 1'))!;

export const entradas = (tipo: Tipo, soloPublicadas = true) =>
  db.all<Entrada>(
    `SELECT * FROM entradas WHERE tipo = ? ${soloPublicadas ? 'AND publicado' : ''} ORDER BY puntos DESC, orden, inicio DESC NULLS LAST, id`,
    tipo
  );

export const entrada = (id: number) => db.get<Entrada>('SELECT * FROM entradas WHERE id = ?', id);

export const skills = () => db.all<Skill>('SELECT * FROM skills ORDER BY categoria, orden, nombre');

export const hayDemo = async () =>
  !!(await db.get('SELECT 1 FROM entradas WHERE demo UNION ALL SELECT 1 FROM skills WHERE demo LIMIT 1'));

export const borrarDemo = () =>
  db.tx(async () => (await db.run('DELETE FROM entradas WHERE demo')) + (await db.run('DELETE FROM skills WHERE demo')));

/** "mar 2026 – presente · 7 meses" */
export function periodo(inicio: string | null, fin: string | null, hoy = new Date()): string {
  if (!inicio) return '';
  const fmt = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString('es-BO', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const a = new Date(`${inicio}T12:00:00Z`);
  const b = fin ? new Date(`${fin}T12:00:00Z`) : hoy;
  const meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() + 1;
  const dur = meses >= 12 ? `${Math.floor(meses / 12)} a${meses >= 24 ? 'ños' : 'ño'}${meses % 12 ? ` ${meses % 12} m` : ''}` : `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const rango = fin === inicio ? fmt(inicio) : `${fmt(inicio)} – ${fin ? fmt(fin) : 'presente'}`;
  return `${rango} · ${dur}`;
}

/** Texto de un formulario → lista; acepta comas o saltos de línea. */
export const lista = (s: FormDataEntryValue | null) =>
  String(s ?? '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

export const slugDe = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'entrada';

// --- Escritura (solo /admin) -----------------------------------------------------------------

const MEDIA_URL = /^\/media\/[a-f0-9]{24}\.(jpg|png|webp|avif|mp4|webm)$/;
/** Solo http(s): un `javascript:` en un enlace sería XSS en la página pública. */
export const urlSegura = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
};
const fecha = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);
const texto = (v: FormDataEntryValue | null, max = 20000) => String(v ?? '').trim().slice(0, max);

/** Formulario de /admin/entrada → fila. Lanza Error con un mensaje legible si algo no cuadra. */
export function entradaDeForm(f: FormData) {
  const tipo = texto(f.get('tipo')) as Tipo;
  if (!TIPOS.includes(tipo)) throw new Error('Tipo inválido');
  const titulo = texto(f.get('titulo'), 200);
  if (!titulo) throw new Error('Falta el título');
  const enlace = texto(f.get('enlace'));
  const media = f.getAll('media_url').map((url, i) => ({
    url: String(url),
    tipo: String(f.getAll('media_tipo')[i]) === 'video' ? 'video' : 'imagen',
    alt: texto(f.getAll('media_alt')[i] ?? '', 300),
  }));
  if (media.some((m) => !MEDIA_URL.test(m.url))) throw new Error('Archivo de media inválido');
  const portada = texto(f.get('portada'));
  return {
    tipo,
    titulo,
    slug: slugDe(texto(f.get('slug')) || titulo),
    resumen: texto(f.get('resumen'), 1000),
    cuerpo_md: texto(f.get('cuerpo_md')),
    cliente: texto(f.get('cliente'), 200) || null,
    rol: texto(f.get('rol'), 200) || null,
    inicio: fecha(f.get('inicio')),
    fin: fecha(f.get('fin')),
    tecnologias: lista(f.get('tecnologias')),
    ia: String(f.get('ia') ?? '')
      .split('\n')
      .map((l) => l.split(':'))
      .filter(([h]) => h?.trim())
      .map(([h, ...u]) => ({ herramienta: h.trim(), uso: u.join(':').trim() })),
    media,
    portada: media.some((m) => m.url === portada && m.tipo === 'imagen') ? portada : (media.find((m) => m.tipo === 'imagen')?.url ?? null),
    enlace: enlace ? (urlSegura(enlace) ?? (() => { throw new Error('El enlace debe empezar con https://'); })()) : null,
    orden: Number(f.get('orden')) || 0,
    puntos: Math.max(0, Math.min(1_000_000, Math.trunc(Number(f.get('puntos')) || 0))),
    publicado: f.get('publicado') === 'on',
  };
}

export async function guardarEntrada(e: ReturnType<typeof entradaDeForm>, id?: number): Promise<number> {
  const v = [e.tipo, e.slug, e.titulo, e.resumen, e.cuerpo_md, e.cliente, e.rol, e.inicio, e.fin,
    JSON.stringify(e.tecnologias), JSON.stringify(e.ia), JSON.stringify(e.media), e.portada, e.enlace, e.orden, e.puntos, e.publicado];
  if (id) {
    // Editar una entrada demo la vuelve propia: ya no se borra con "Borrar datos demo".
    await db.run(
      `UPDATE entradas SET tipo=?, slug=?, titulo=?, resumen=?, cuerpo_md=?, cliente=?, rol=?, inicio=?, fin=?,
              tecnologias=?, ia=?, media=?, portada=?, enlace=?, orden=?, puntos=?, publicado=?, demo=false WHERE id=?`,
      ...v, id
    );
    return id;
  }
  return (await db.get<{ id: number }>(
    `INSERT INTO entradas (tipo, slug, titulo, resumen, cuerpo_md, cliente, rol, inicio, fin, tecnologias, ia, media, portada, enlace, orden, puntos, publicado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ...v
  ))!.id;
}

export const borrarEntrada = (id: number) => db.run('DELETE FROM entradas WHERE id = ?', id);

export async function guardarPerfil(f: FormData) {
  const pares = (campo: string) =>
    String(f.get(campo) ?? '')
      .split('\n')
      .map((l) => l.split('|').map((x) => x.trim()))
      .filter((p) => p[0]);
  const enlaces = pares('enlaces').map(([nombre, url]) => {
    const u = urlSegura(url ?? '');
    if (!u) throw new Error(`Enlace inválido: ${nombre}`);
    return { nombre, url: u };
  });
  const foto = texto(f.get('foto')), silueta = texto(f.get('silueta'));
  const correo = texto(f.get('correo'), 200);
  if (correo && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(correo)) throw new Error('Correo de contacto inválido');
  if ((foto && !MEDIA_URL.test(foto)) || (silueta && !MEDIA_URL.test(silueta))) throw new Error('Archivo de media inválido');
  await db.run(
    'UPDATE perfil SET nombre=?, titular=?, bio_md=?, estudios=?, enlaces=?, correo=?, foto=?, silueta=? WHERE id = 1',
    texto(f.get('nombre'), 120) || 'Bryan Iban Mamani Quispe',
    texto(f.get('titular'), 200),
    texto(f.get('bio_md')),
    JSON.stringify(pares('estudios').map(([titulo, lugar = '', desde = '', hasta = '']) => ({ titulo, lugar, desde: desde || null, hasta: hasta || null }))),
    JSON.stringify(enlaces),
    correo || null,
    foto || null,
    silueta || null
  );
}

export async function agregarSkill(nombre: string, categoria: string, icono = '') {
  if (!nombre.trim() || !(categoria in CATEGORIAS)) throw new Error('Nombre o categoría inválidos');
  await db.run(
    `INSERT INTO skills (nombre, categoria, icono, orden) VALUES (?, ?, ?, (SELECT coalesce(max(orden), 0) + 1 FROM skills))
     ON CONFLICT (nombre) DO UPDATE SET categoria = excluded.categoria, icono = excluded.icono, demo = false`,
    nombre.trim().slice(0, 80),
    categoria,
    icono.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || null
  );
}
export const borrarSkill = (id: number) => db.run('DELETE FROM skills WHERE id = ?', id);

// --- Solicitudes de contacto (formulario público → /admin/solicitudes) -------------------------

export type Solicitud = { id: number; creada: Date; nombre: string | null; email: string; telefono: string; descripcion: string; leida: boolean };

/** Valida el formulario público. Lanza Error con un mensaje para mostrarle a quien escribe. */
export function solicitudDeForm(f: FormData) {
  const email = texto(f.get('email'), 200);
  const telefono = texto(f.get('telefono'), 40);
  const descripcion = texto(f.get('descripcion'), 3000);
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) throw new Error('Revisa el correo.');
  if (!/^\+?[\d\s().-]{6,20}$/.test(telefono) || (telefono.match(/\d/g)?.length ?? 0) < 6) throw new Error('Revisa el número de teléfono.');
  if (descripcion.length < 10) throw new Error('Cuéntame un poco más sobre tu solicitud (mínimo 10 caracteres).');
  return { nombre: texto(f.get('nombre'), 120) || null, email, telefono, descripcion };
}

export const guardarSolicitud = (s: ReturnType<typeof solicitudDeForm>, ip: string | null) =>
  db.run('INSERT INTO solicitudes (nombre, email, telefono, descripcion, ip) VALUES (?, ?, ?, ?, ?)', s.nombre, s.email, s.telefono, s.descripcion, ip);

export const solicitudes = () => db.all<Solicitud>('SELECT * FROM solicitudes ORDER BY leida, creada DESC');
export const solicitudesNuevas = async () => (await db.get<{ n: number }>('SELECT count(*) AS n FROM solicitudes WHERE NOT leida'))!.n;
