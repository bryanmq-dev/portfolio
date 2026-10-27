// De invasion/test/prueba-db.ts: cada archivo de test usa su propio schema y lo borra al terminar.
// Importar ESTE módulo antes que ../src/db.ts.
import { after } from 'node:test';

process.env.DATABASE_URL ??= 'postgres://portfolio:portfolio@localhost:5435/portfolio';
process.env.DB_SCHEMA = `t_${process.pid}_${Date.now()}`;

after(async () => {
  const { pool, SCHEMA } = await import('../src/db.ts');
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await pool.end();
});
