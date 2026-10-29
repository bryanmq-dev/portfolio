// Datos de ejemplo (SEED_DEMO=1). Todo lo que se inserta acá lleva demo = true y se borra con
// un botón en /admin. Los textos salen de los README de cada proyecto; fechas y media son mock.
type Db = typeof import('./db.ts').db;

const P = (
  slug: string,
  titulo: string,
  resumen: string,
  tecnologias: string[],
  ia: [string, string][],
  inicio: string,
  fin: string | null,
  cliente: string | null = null
) => ({ tipo: 'proyecto', slug, titulo, resumen, tecnologias, ia, inicio, fin, cliente, rol: null as string | null });

const ENTRADAS = [
  P('invasion-de-las-torres', 'Invasión de las Torres',
    'Competencia por postas en el campus: el docente escanea el QR del equipo y en su teléfono se abre un desafío de realidad aumentada; el marcador se actualiza en vivo.',
    ['Astro', 'Node.js', 'PostgreSQL', 'three.js', 'WebXR', 'Docker', 'S3'],
    [['Claude Code', 'arquitectura, pruebas por schema y migración de SQLite a PostgreSQL'], ['HyperFrames', 'teaser promocional de 15 s en video vertical']],
    '2026-09-01', '2026-10-30', 'UNIVALLE · Ing. de Sistemas'),
  P('la-paz-2050', 'La Paz 2050 · Smart City',
    'Gemelo digital de La Paz con zonas reconstruidas desde OpenStreetMap y elevación SRTM, flota de minibuses simulada, alertas espaciales en PostGIS y vista VR/AR.',
    ['React', 'Vite', 'three.js', 'PostGIS', 'WebXR', 'Docker', 'nginx'],
    [['Claude Code', 'pipeline OSM → malla 3D y simulador de tráfico'], ['HyperFrames', 'video para la feria']],
    '2026-10-15', null),
  P('stan', 'STAN · Gestión de titulación',
    'Sistema de proyectos de grado: revisiones, anotaciones, notificaciones y cronogramas académicos.',
    ['TanStack Start', 'React', 'Django', 'Django REST Framework', 'Supabase', 'Docker'],
    [['Claude Code', 'agentes con AGENTS.md y skills propias del repositorio']],
    '2026-09-14', null),
  P('hierro-brothers', 'Hierro Brothers',
    'Sitio de hospitality y coffee collection con editor de contenido propio, login con segundo factor y versión en dos idiomas.',
    ['Astro', 'SQLite', 'Tailwind CSS', 'MapLibre', 'sharp'],
    [['Claude Code', 'CMS en línea y pruebas de seguridad contra el servidor real']],
    '2026-09-24', '2026-10-24', 'Hierro Brothers'),
  P('redbox', 'RedBox',
    'Sitio de una empresa de ciberseguridad ofensiva con CMS headless y auditoría de licencias de cada asset visual.',
    ['Astro', 'Strapi', 'Tailwind CSS', 'Playwright', 'Docker'],
    [['Claude Code', 'auditoría de procedencia y licencias de imágenes']],
    '2026-08-12', '2026-09-07', 'RedBox'),
  P('helados-panda', 'Cuadro de mando · Helados Panda',
    'Prototipo académico de cuadro de mando integral sobre un almacén de datos dimensional: cada cifra es una consulta SQL sobre tablas de hechos.',
    ['Python', 'SQLite', 'SQL', 'HTML'],
    [['Claude Code', 'generador de hechos que cuadra contra las series publicadas']],
    '2026-09-08', '2026-09-10'),
  P('doomnimal', 'DOOMNIMAL',
    'FPS arcade de supervivencia por rondas contra un ejército de animales soldado. Hecho en La Paz.',
    ['Unity', 'C#'],
    [['Unity MCP', 'escena y prefabs manejados por el agente desde el editor']],
    '2026-10-09', null),
  P('vision-mediapipe', 'Visión por computadora · PDI',
    'Detección de manos y malla facial en el navegador con MediaPipe, y filtros de convolución configurables (Sobel, etc.).',
    ['TypeScript', 'Vite', 'MediaPipe'],
    [],
    '2026-06-27', '2026-07-23'),
  P('ciber-college', 'Ciber College',
    'Demo interactiva de ciberseguridad para 75 estudiantes de colegio en 15 minutos.',
    ['Node.js', 'Express'],
    [['Claude Code', 'demo en vivo armada en una tarde']],
    '2026-09-03', '2026-09-18'),
  {
    tipo: 'experiencia', slug: 'univalle-frontend', titulo: 'Frontend Developer', cliente: 'Universidad Privada del Valle',
    rol: 'Frontend Developer', resumen: 'Mantenimiento y mejora de sistemas internos en .NET WebForms junto a otros departamentos.',
    tecnologias: ['.NET WebForms', 'C#', 'JavaScript', 'SQL'], ia: [], inicio: '2025-05-01', fin: '2025-10-31',
  },
  {
    tipo: 'evento', slug: 'sociedad-cientifica', titulo: 'Presidencia · Sociedad Científica de Ing. de Sistemas',
    cliente: 'UNIVALLE', rol: 'Presidente', resumen: 'Dirección de la sociedad científica de la carrera: eventos, talleres y trabajo con colegios y otras carreras.',
    tecnologias: [], ia: [], inicio: '2025-01-01', fin: null,
  },
  {
    tipo: 'evento', slug: 'invasion-evento', titulo: 'Invasión de las Torres · Halloween', cliente: 'UNIVALLE',
    rol: 'Organizador', resumen: 'Competencia por postas en las dos torres del campus, con equipos por semestre y docentes en cada posta.',
    tecnologias: [], ia: [], inicio: '2026-10-30', fin: '2026-10-30',
  },
  {
    tipo: 'evento', slug: 'ciber-college-taller', titulo: 'Taller de ciberseguridad para colegios', cliente: 'Colegio',
    rol: 'Expositor', resumen: '75 estudiantes, 15 minutos, una demo en vivo de lo que filtra un teléfono.',
    tecnologias: [], ia: [], inicio: '2026-09-18', fin: '2026-09-18',
  },
];

const SKILLS: [string, string][] = [
  ...['JavaScript', 'TypeScript', 'C#', 'SQL', 'Kotlin', 'Python', 'React', 'Next.js', 'Astro', 'Blazor', 'Tailwind CSS',
    '.NET Core', 'Django', 'PostgreSQL', 'MySQL', 'MongoDB', 'Supabase', 'three.js'].map((n) => [n, 'tecnica'] as [string, string]),
  ...['Docker', 'Coolify', 'Cloudflare Tunnels', 'AWS EC2', 'Hostinger', 'Render', 'Git', 'Unity'].map((n) => [n, 'herramienta'] as [string, string]),
  ...['Claude Code', 'MCP', 'Skills de agente', 'HyperFrames', 'Artifacts'].map((n) => [n, 'ia'] as [string, string]),
  ...['Liderazgo de equipos', 'Organización de eventos', 'Cuadro de mando integral', 'Oratoria'].map((n) => [n, 'negocio'] as [string, string]),
];

export async function sembrarDemo(db: Db) {
  await db.tx(async () => {
    // Una sola vez por base: si después se borran los demo, no vuelven en el próximo arranque.
    if ((await db.run("INSERT INTO ajustes VALUES ('demo_sembrado', now()::text) ON CONFLICT DO NOTHING")) === 0) return;
    await db.run(
      `UPDATE perfil SET titular = ?, bio_md = ?, estudios = ?, enlaces = ? WHERE bio_md = ''`,
      'Full-stack developer · Presidente de la Sociedad Científica de Ing. de Sistemas',
      'Desarrollador de software enfocado en sistemas modulares, seguros y escalables. Construyo con agentes de IA como parte del oficio: diseño, pruebas y despliegue.',
      JSON.stringify([{ titulo: 'Ingeniería de Sistemas', lugar: 'Universidad Privada del Valle', desde: null, hasta: null }]),
      JSON.stringify([{ nombre: 'GitHub', url: 'https://github.com/bryanmq-dev' }])
    );
    let orden = 0;
    for (const e of ENTRADAS) {
      await db.run(
        `INSERT INTO entradas (tipo, slug, titulo, resumen, cliente, rol, inicio, fin, tecnologias, ia, orden, demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true) ON CONFLICT (slug) DO NOTHING`,
        e.tipo, e.slug, e.titulo, e.resumen, e.cliente, e.rol, e.inicio, e.fin,
        JSON.stringify(e.tecnologias), JSON.stringify(e.ia.map(([herramienta, uso]) => ({ herramienta, uso }))), orden++
      );
    }
    for (const [i, [nombre, categoria]] of SKILLS.entries()) {
      await db.run('INSERT INTO skills (nombre, categoria, orden, demo) VALUES (?, ?, ?, true) ON CONFLICT DO NOTHING', nombre, categoria, i);
    }
  });
}
