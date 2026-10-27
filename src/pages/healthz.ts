import type { APIRoute } from 'astro';
import { db } from '../db.ts';

// Para el healthcheck de Docker: responde 200 solo si la base contesta.
export const GET: APIRoute = async () => {
  try {
    await db.get('SELECT 1');
    return new Response('ok');
  } catch {
    return new Response('sin base', { status: 503 });
  }
};
