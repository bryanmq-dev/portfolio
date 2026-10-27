// Un módulo y no un .sql: viaja dentro del bundle y funciona igual bajo Vite que bajo `node --test`.
// Idempotente: se ejecuta en cada arranque.
export const ESQUEMA = `
CREATE TABLE IF NOT EXISTS perfil (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre      text NOT NULL,
  titular     text NOT NULL DEFAULT '',
  bio_md      text NOT NULL DEFAULT '',
  estudios    jsonb NOT NULL DEFAULT '[]',   -- [{titulo, lugar, desde, hasta}]
  enlaces     jsonb NOT NULL DEFAULT '[]',   -- [{nombre, url}]
  foto        text,                          -- /media/… foto real
  silueta     text                           -- /media/… PNG recortado (alpha) para el grafo
);
INSERT INTO perfil (nombre) VALUES ('Bryan Iban Mamani Quispe') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS entradas (
  id          serial PRIMARY KEY,
  tipo        text NOT NULL CHECK (tipo IN ('proyecto', 'experiencia', 'evento')),
  slug        text NOT NULL UNIQUE,
  titulo      text NOT NULL,
  resumen     text NOT NULL DEFAULT '',
  cuerpo_md   text NOT NULL DEFAULT '',
  cliente     text,
  rol         text,
  inicio      date,
  fin         date,                          -- null = en curso
  tecnologias jsonb NOT NULL DEFAULT '[]',   -- ["Astro", "PostgreSQL"]
  ia          jsonb NOT NULL DEFAULT '[]',   -- [{herramienta, uso}]
  media       jsonb NOT NULL DEFAULT '[]',   -- [{url, tipo: 'imagen'|'video', alt}]
  enlace      text,
  orden       int NOT NULL DEFAULT 0,
  publicado   boolean NOT NULL DEFAULT true,
  demo        boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS skills (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL UNIQUE,
  categoria   text NOT NULL CHECK (categoria IN ('tecnica', 'negocio', 'herramienta', 'ia')),
  orden       int NOT NULL DEFAULT 0,
  demo        boolean NOT NULL DEFAULT false
);
`;

// Marcas de una sola vez (p. ej. 'demo_sembrado'): al borrar los datos demo no vuelven a aparecer.
// Columnas agregadas después de la primera versión (idempotente).
export const MIGRACIONES = `
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS portada text;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS puntos int NOT NULL DEFAULT 0; -- más puntos = más arriba
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS correo text; -- público: CTA y contacto (no es el de acceso al admin)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS icono text;
CREATE TABLE IF NOT EXISTS solicitudes (
  id          serial PRIMARY KEY,
  creada      timestamptz NOT NULL DEFAULT now(),
  nombre      text,
  email       text NOT NULL,
  telefono    text NOT NULL,
  descripcion text NOT NULL,
  ip          text,
  leida       boolean NOT NULL DEFAULT false
); -- slug de simple-icons; null = se busca por nombre
`;

export const AJUSTES = `CREATE TABLE IF NOT EXISTS ajustes (clave text PRIMARY KEY, valor text NOT NULL);`;
