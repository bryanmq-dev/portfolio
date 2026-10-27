import './prueba-db.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'a'.repeat(64);
const { cifrar, descifrar, guardarSmtp, leerSmtp, mensajeSolicitud } = await import('../src/correo.ts');
const { db } = await import('../src/db.ts');

test('la app password se guarda cifrada y vacía conserva la anterior', async () => {
  assert.equal(descifrar(cifrar('abcd efgh')), 'abcd efgh');
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ servidor: 'smtp.gmail.com', puerto: '465', usuario: 'yo@gmail.com', activo: 'on', ...o })) f.append(k, v);
    return f;
  };
  await guardarSmtp(fd({ clave: 'abcd efgh ijkl mnop' }));
  const guardada = (await db.get<{ valor: string }>("SELECT valor FROM ajustes WHERE clave = 'smtp_clave'"))!.valor;
  assert.ok(!guardada.includes('abcd')); // nunca en texto plano
  await guardarSmtp(fd({ clave: '' }));
  const c = await leerSmtp();
  assert.equal(c.clave, 'abcdefghijklmnop'); // sin los espacios que muestra Gmail
  assert.equal(c.destino, 'yo@gmail.com'); // sin destino: al mismo de la cuenta
  await assert.rejects(guardarSmtp(fd({ puerto: '99999' })), /Puerto/);
});

test('el aviso responde directo al solicitante', () => {
  const m = mensajeSolicitud(
    { nombre: 'Ana', email: 'ana@empresa.com', telefono: '+591 71234567', descripcion: 'Necesito un sitio.' },
    { activo: true, servidor: 'smtp.gmail.com', puerto: 465, usuario: 'yo@gmail.com', clave: 'x', destino: 'yo@gmail.com' },
    'https://bryanmq.com'
  );
  assert.deepEqual(m.replyTo, { name: 'Ana', address: 'ana@empresa.com' });
  assert.equal(m.to, 'yo@gmail.com');
  assert.match(m.text, /\+591 71234567/);
  assert.match(m.text, /Necesito un sitio\./);
});
