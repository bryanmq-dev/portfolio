// Genera las variables del admin para .env / Coolify:  pnpm admin:secret correo@x.com 'clave-larga'
import bcrypt from 'bcryptjs';
import { newSecret, otpauthUri } from '../src/totp.ts';

const [email, clave] = process.argv.slice(2);
if (!email || !clave || clave.length < 12) {
  console.error("Uso: pnpm admin:secret correo@dominio.com 'clave de 12+ caracteres'");
  process.exit(1);
}
const secreto = newSecret();
console.log(`ADMIN_EMAIL=${email}`);
// Entre comillas simples: el hash lleva '$' y Docker Compose lo interpolaría.
console.log(`ADMIN_PASSWORD_HASH='${bcrypt.hashSync(clave, 12)}'`);
console.log(`ADMIN_TOTP_SECRET=${secreto}`);
console.error(`\nAgrega esto a tu app de autenticación (o pega el URI en un generador de QR):\n${otpauthUri(email, secreto)}`);
