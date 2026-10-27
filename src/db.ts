import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
// Copiado de invasion/src/db.ts: pool + `?` posicional + transacciones por AsyncLocalStorage.
import { ESQUEMA, AJUSTES, MIGRACIONES } from './schema.ts';
import { sembrarDemo } from './seed.ts';

export const URL_DB = process.env.DATABASE_URL ?? 'postgres://portfolio:portfolio@localhost:5435/portfolio';
/** Solo para las pruebas: cada archivo de test trabaja en su propio schema. */
export const SCHEMA = process.env.DB_SCHEMA;

pg.types.setTypeParser(20, Number); // count(*) llega como texto; cabe en un number
pg.types.setTypeParser(1082, (s) => s); // date → 'YYYY-MM-DD' tal cual, sin corrimiento de zona

export const pool = new pg.Pool({
  connectionString: URL_DB,
  max: 10,
  options: SCHEMA ? `-c search_path=${SCHEMA}` : undefined,
});
// Si Postgres se reinicia, las conexiones ociosas emiten 'error'; sin listener Node tumba la app.
pool.on('error', (e) => console.warn('[portfolio] conexión a la base perdida (se reintenta):', e.message));

const enTx = new AsyncLocalStorage<pg.PoolClient>();
const ejecutor = () => enTx.getStore() ?? pool;

// ponytail: SQL con `?` (ningún literal ni operador usa `?`) en vez de $1, $2…
const posicional = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

export const db = {
  async all<T = any>(sql: string, ...p: unknown[]): Promise<T[]> {
    return (await ejecutor().query(posicional(sql), p)).rows;
  },
  async get<T = any>(sql: string, ...p: unknown[]): Promise<T | undefined> {
    return (await db.all<T>(sql, ...p))[0];
  },
  /** Filas afectadas. */
  async run(sql: string, ...p: unknown[]): Promise<number> {
    return (await ejecutor().query(posicional(sql), p)).rowCount ?? 0;
  },
  async exec(sql: string): Promise<void> {
    await ejecutor().query(sql);
  },
  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (enTx.getStore()) return fn();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await enTx.run(c, fn);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  },
};

export const esDuplicado = (e: any) => e?.code === '23505';

async function iniciar() {
  if (SCHEMA) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await db.exec(ESQUEMA + AJUSTES + MIGRACIONES);
  if (process.env.SEED_DEMO === '1') await sembrarDemo(db);
}

await iniciar();
