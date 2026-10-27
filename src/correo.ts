import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db.ts';
import type { Solicitud } from './contenido.ts';

// Aviso por correo de cada solicitud de contacto. La configuración SMTP se edita en /admin/correo
// (tabla `ajustes`); las variables SMTP_* sirven de valor por defecto (p. ej. desde Coolify).

export type Smtp = { activo: boolean; servidor: string; puerto: number; usuario: string; clave: string; destino: string };

// La app password se guarda cifrada (AES-256-GCM) con una clave derivada de SESSION_SECRET.
// Si se rota SESSION_SECRET hay que volver a cargarla en el admin.
const llave = () => createHash('sha256').update(`smtp:${process.env.SESSION_SECRET ?? ''}`).digest();
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', llave(), iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString('base64');
}
export function descifrar(blob: string): string | null {
  try {
    const b = Buffer.from(blob, 'base64');
    const d = createDecipheriv('aes-256-gcm', llave(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null; // otra SESSION_SECRET o dato dañado
  }
}

const CLAVES = ['smtp_activo', 'smtp_servidor', 'smtp_puerto', 'smtp_usuario', 'smtp_clave', 'smtp_destino'] as const;

export async function leerSmtp(): Promise<Smtp> {
  const filas = await db.all<{ clave: string; valor: string }>('SELECT clave, valor FROM ajustes WHERE clave = ANY(?)', CLAVES);
  const a = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  const e = process.env;
  const usuario = a.smtp_usuario ?? e.SMTP_USUARIO ?? '';
  return {
    activo: (a.smtp_activo ?? (e.SMTP_USUARIO ? '1' : '0')) === '1',
    servidor: a.smtp_servidor ?? e.SMTP_SERVIDOR ?? 'smtp.gmail.com',
    puerto: Number(a.smtp_puerto ?? e.SMTP_PUERTO ?? 465),
    usuario,
    clave: (a.smtp_clave ? descifrar(a.smtp_clave) : null) ?? e.SMTP_CLAVE ?? '',
    destino: a.smtp_destino || e.SMTP_DESTINO || usuario,
  };
}

const correoValido = (s: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);

/** Guarda lo que llega del admin. Clave vacía = conservar la actual. */
export async function guardarSmtp(f: FormData) {
  const servidor = String(f.get('servidor') ?? '').trim();
  const puerto = Number(f.get('puerto'));
  const usuario = String(f.get('usuario') ?? '').trim();
  const destino = String(f.get('destino') ?? '').trim();
  const clave = String(f.get('clave') ?? '').replace(/\s/g, ''); // Gmail la muestra en bloques de 4 con espacios
  if (!/^[a-z0-9.-]+$/i.test(servidor)) throw new Error('Servidor SMTP inválido.');
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('Puerto inválido.');
  if (usuario && !correoValido(usuario)) throw new Error('El correo de la cuenta SMTP no es válido.');
  if (destino && !correoValido(destino)) throw new Error('El correo de destino no es válido.');
  const valores: Record<string, string> = {
    smtp_activo: f.get('activo') === 'on' ? '1' : '0',
    smtp_servidor: servidor,
    smtp_puerto: String(puerto),
    smtp_usuario: usuario,
    smtp_destino: destino,
  };
  if (clave) valores.smtp_clave = cifrar(clave);
  await db.tx(async () => {
    for (const [k, v] of Object.entries(valores))
      await db.run('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor', k, v);
    if (f.get('borrar_clave') === 'on') await db.run("DELETE FROM ajustes WHERE clave = 'smtp_clave'");
  });
}

const transporte = (c: Smtp) =>
  nodemailer.createTransport({
    host: c.servidor,
    port: c.puerto,
    secure: c.puerto === 465, // 465 = TLS directo; 587 = STARTTLS
    auth: { user: c.usuario, pass: c.clave },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });

/** El correo que te llega por cada solicitud. "Responder" va directo al solicitante. */
export function mensajeSolicitud(s: Pick<Solicitud, 'nombre' | 'email' | 'telefono' | 'descripcion'>, c: Smtp, sitio: string) {
  const quien = s.nombre ? `${s.nombre} <${s.email}>` : s.email;
  return {
    from: { name: 'Portafolio bryanmq-dev', address: c.usuario }, // Gmail exige que el remitente sea la cuenta
    to: c.destino,
    replyTo: s.nombre ? { name: s.nombre, address: s.email } : s.email,
    subject: `Nueva solicitud de contacto — ${s.nombre ?? s.email}`,
    text: [
      `De: ${quien}`,
      `Correo: ${s.email}`,
      `Teléfono: ${s.telefono}`,
      '',
      s.descripcion,
      '',
      `Responde a este correo para escribirle directamente.`,
      `Todas las solicitudes: ${sitio}/admin/solicitudes`,
    ].join('\n'),
  };
}

const sitio = () => process.env.SITE_ORIGIN ?? 'https://bryanmq.com';

/** Avisa de una solicitud. Nunca lanza: si falla, la solicitud igual quedó guardada en el admin. */
export async function avisarSolicitud(s: Parameters<typeof mensajeSolicitud>[0]): Promise<void> {
  try {
    const c = await leerSmtp();
    if (!c.activo || !c.usuario || !c.clave) return;
    await transporte(c).sendMail(mensajeSolicitud(s, c, sitio()));
  } catch (e) {
    console.warn('[correo] no se pudo avisar la solicitud:', (e as Error).message);
  }
}

/** Botón "Enviar prueba" del admin: aquí sí se informa el error. */
export async function enviarPrueba(): Promise<void> {
  const c = await leerSmtp();
  if (!c.usuario || !c.clave) throw new Error('Falta el correo de la cuenta o la app password.');
  await transporte(c).sendMail({
    from: { name: 'Portafolio bryanmq-dev', address: c.usuario },
    to: c.destino,
    subject: 'Prueba de correo del portafolio',
    text: `Si lees esto, el aviso de solicitudes de ${sitio()} está bien configurado.`,
  });
}
