import './prueba-db.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SEED_DEMO = '1';
const { db } = await import('../src/db.ts');
const { entradas, borrarDemo, hayDemo, periodo, slugDe } = await import('../src/contenido.ts');
const { sembrarDemo } = await import('../src/seed.ts');

test('el demo se siembra una vez y se borra sin volver', async () => {
  assert.ok((await entradas('proyecto')).length > 0);
  assert.ok(await hayDemo());
  await db.run("INSERT INTO entradas (tipo, slug, titulo) VALUES ('proyecto', 'mio', 'Mío')");
  await borrarDemo();
  assert.equal(await hayDemo(), false);
  assert.deepEqual((await entradas('proyecto')).map((e) => e.slug), ['mio']); // lo propio no se toca
  await sembrarDemo(db);
  assert.equal(await hayDemo(), false);
});

test('periodo y slug', () => {
  assert.equal(periodo('2025-05-01', '2025-10-31'), 'may 2025 – oct 2025 · 6 meses');
  assert.equal(periodo('2026-10-30', '2026-10-30'), 'oct 2026 · 1 mes');
  assert.equal(slugDe('La Paz 2050 · Smart City!'), 'la-paz-2050-smart-city');
});

test('el formulario de entrada rechaza enlaces y media peligrosos', async () => {
  const { entradaDeForm, guardarEntrada, entrada } = await import('../src/contenido.ts');
  const f = (extra: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ tipo: 'proyecto', titulo: 'Nuevo Proyecto', publicado: 'on', ...extra })) fd.append(k, v);
    return fd;
  };
  assert.throws(() => entradaDeForm(f({ enlace: 'javascript:alert(1)' })), /https/);
  assert.throws(() => entradaDeForm(f({ media_url: '/etc/passwd', media_tipo: 'imagen' })), /media/);
  const id = await guardarEntrada(entradaDeForm(f({ ia: 'Claude Code: pruebas: e2e', tecnologias: 'Astro, Postgres\nthree.js' })));
  const e = (await entrada(id))!;
  assert.equal(e.slug, 'nuevo-proyecto');
  assert.deepEqual(e.tecnologias, ['Astro', 'Postgres', 'three.js']);
  assert.deepEqual(e.ia, [{ herramienta: 'Claude Code', uso: 'pruebas: e2e' }]);
  // Más puntos = más arriba en el historial.
  await guardarEntrada(entradaDeForm(f({ titulo: 'Estrella', puntos: '50' })));
  assert.equal((await entradas('proyecto'))[0].slug, 'estrella');
});

test('solicitud de contacto: valida y guarda', async () => {
  const { solicitudDeForm, guardarSolicitud, solicitudes, solicitudesNuevas } = await import('../src/contenido.ts');
  const f = (o: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ email: 'ana@empresa.com', telefono: '+591 712-34567', descripcion: 'Necesito un sitio web con panel.', ...o })) fd.append(k, v);
    return fd;
  };
  assert.throws(() => solicitudDeForm(f({ email: 'no-es-correo' })), /correo/);
  assert.throws(() => solicitudDeForm(f({ telefono: '12' })), /teléfono/);
  assert.throws(() => solicitudDeForm(f({ telefono: '<script>' })), /teléfono/);
  assert.throws(() => solicitudDeForm(f({ descripcion: 'hola' })), /más/);
  await guardarSolicitud(solicitudDeForm(f({})), '1.2.3.4');
  assert.equal(await solicitudesNuevas(), 1);
  assert.equal((await solicitudes())[0].email, 'ana@empresa.com');
});

test('resumen para buscadores: limpia markdown sin romper palabras con guion', async () => {
  const { resumir } = await import('../src/seo.ts');
  assert.equal(resumir('## Hola\n- **full-stack** en [bryanmq-dev](https://x.y)'), 'Hola full stack en bryanmq-dev'.replace('full stack', 'full-stack'));
  assert.ok(resumir('palabra '.repeat(60)).endsWith('…'));
  assert.ok(resumir('palabra '.repeat(60)).length <= 158);
});
