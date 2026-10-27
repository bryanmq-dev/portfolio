import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import type { APIContext, AstroCookies } from 'astro';
import bcrypt from 'bcryptjs';
import { verifyTotp } from './totp.ts';

// Base: invasion/src/auth.ts (cookie firmada + CSRF double-submit). Cambia que hay un único
// admin, definido por env (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET), con 2FA TOTP.
// ponytail: sin tabla de usuarios ni de sesiones; revocar todo = rotar SESSION_SECRET.

const SECRETO =
  process.env.SESSION_SECRET ??
  (() => {
    if (process.env.NODE_ENV === 'production') console.warn('[auth] SESSION_SECRET sin definir: las sesiones no sobreviven un reinicio');
    return randomBytes(32).toString('hex');
  })();

const COOKIE = 'sesion';
const DURACION = 60 * 60 * 8;
const seguro = () => process.env.NODE_ENV === 'production';

const mac = (dato: string) => createHmac('sha256', SECRETO).update(dato).digest('base64url');
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function firmar(dato: string): string {
  return `${dato}.${mac(dato)}`;
}
export function verificar(token: string | undefined): string | null {
  if (!token) return null;
  const corte = token.lastIndexOf('.');
  if (corte < 1) return null;
  const dato = token.slice(0, corte);
  return igual(token.slice(corte + 1), mac(dato)) ? dato : null;
}

// --- Intentos fallidos por IP ----------------------------------------------
// ponytail: en memoria, una sola instancia; pasa a la base si algún día hay réplicas.
const fallos = new Map<string, { n: number; hasta: number }>();
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60_000;
export const bloqueado = (ip: string) => (fallos.get(ip)?.hasta ?? 0) > Date.now();
function fallo(ip: string) {
  const f = fallos.get(ip) ?? { n: 0, hasta: 0 };
  f.n++;
  if (f.n >= MAX_FALLOS) Object.assign(f, { n: 0, hasta: Date.now() + BLOQUEO_MS });
  fallos.set(ip, f);
}

// Paso TOTP ya usado: un código visto (o robado) no se puede reutilizar.
let ultimoPaso = 0;
const HASH_FALSO = bcrypt.hashSync(randomBytes(8).toString('hex'), 10);

export function credencialesValidas(email: string, clave: string, codigo: string, ahora = Date.now()): boolean {
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !ADMIN_TOTP_SECRET) return false;
  // La clave se compara siempre, aunque el correo no coincida: mismo tiempo de respuesta.
  const claveOk = bcrypt.compareSync(clave, email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ? ADMIN_PASSWORD_HASH : HASH_FALSO);
  if (!claveOk || email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return false;
  const paso = verifyTotp(ADMIN_TOTP_SECRET, codigo.replace(/\s/g, ''), ultimoPaso, ahora);
  if (paso === null) return false;
  ultimoPaso = paso;
  return true;
}

export function iniciarSesion(ctx: APIContext, ip: string, email: string, clave: string, codigo: string): boolean {
  if (bloqueado(ip)) return false;
  if (!credencialesValidas(email, clave, codigo)) {
    fallo(ip);
    return false;
  }
  fallos.delete(ip);
  ctx.cookies.set(COOKIE, firmar(String(Date.now() + DURACION * 1000)), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: DURACION,
    secure: seguro(),
  });
  return true;
}

export const cerrarSesion = (cookies: AstroCookies) => cookies.delete(COOKIE, { path: '/' });

export function haySesion(cookies: AstroCookies): boolean {
  const vence = verificar(cookies.get(COOKIE)?.value);
  return vence !== null && Number(vence) > Date.now();
}

// --- CSRF (double-submit) ----------------------------------------------------
const CSRF = 'csrf';

export function tokenCsrf(cookies: AstroCookies): string {
  let t = cookies.get(CSRF)?.value;
  if (!t) {
    t = randomBytes(16).toString('hex');
    cookies.set(CSRF, t, { sameSite: 'strict', path: '/', secure: seguro() });
  }
  return t;
}

export function csrfValido(cookies: AstroCookies, enviado: string | null): boolean {
  const cookie = cookies.get(CSRF)?.value;
  return !!cookie && !!enviado && igual(cookie, enviado);
}
