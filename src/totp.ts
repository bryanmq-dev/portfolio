import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// RFC 6238 (TOTP, SHA-1, 6 digits, 30 s): what Google Authenticator, Authy, 1Password, etc. expect.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

export function newSecret(): string {
  return base32(randomBytes(20));
}

function base32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function unbase32(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', unbase32(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}

/**
 * Accepts the current step ±1 (clock drift). A step at or below `lastStep` is
 * rejected, so a code that was already used (or sniffed) can't be replayed.
 * Returns the matched step, or null.
 */
export function verifyTotp(secret: string, code: string, lastStep: number, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const given = Buffer.from(code);
  const base = currentStep(now);
  let matched: number | null = null;
  for (const step of [base - 1, base, base + 1]) {
    // no early exit: every candidate is compared, in constant time
    const ok = timingSafeEqual(given, Buffer.from(codeAt(secret, step)));
    if (ok && step > lastStep) matched = step;
  }
  return matched;
}

export const otpauthUri = (email: string, secret: string) =>
  `otpauth://totp/bryanmq.com:${encodeURIComponent(email)}?secret=${secret}&issuer=bryanmq.com&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
