import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { codeAt, currentStep, newSecret } from '../src/totp.ts';

const secreto = newSecret();
Object.assign(process.env, {
  ADMIN_EMAIL: 'yo@bryanmq.com',
  ADMIN_PASSWORD_HASH: bcrypt.hashSync('clave-de-prueba-larga', 4),
  ADMIN_TOTP_SECRET: secreto,
  SESSION_SECRET: 'x'.repeat(64),
});
const { credencialesValidas, firmar, verificar } = await import('../src/auth.ts');

test('login exige clave, correo y código; el código no se reutiliza', () => {
  const ahora = Date.now();
  const codigo = codeAt(secreto, currentStep(ahora));
  assert.equal(credencialesValidas('yo@bryanmq.com', 'mala', codigo, ahora), false);
  assert.equal(credencialesValidas('otro@x.com', 'clave-de-prueba-larga', codigo, ahora), false);
  assert.equal(credencialesValidas('yo@bryanmq.com', 'clave-de-prueba-larga', '000000', ahora), false);
  assert.equal(credencialesValidas('YO@bryanmq.com', 'clave-de-prueba-larga', codigo, ahora), true);
  assert.equal(credencialesValidas('yo@bryanmq.com', 'clave-de-prueba-larga', codigo, ahora), false);
});

test('cookie firmada', () => {
  const t = firmar('123');
  assert.equal(verificar(t), '123');
  assert.equal(verificar(t.replace('123', '999')), null);
  assert.equal(verificar('basura'), null);
});
