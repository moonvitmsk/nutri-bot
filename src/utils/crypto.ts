// L-4: Encryption at rest for sensitive user data (phones, lab results)
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_SOURCE = process.env.ENCRYPTION_KEY || 'nutri-fallback-key-do-not-use-prod';
const KEY = Buffer.from(KEY_SOURCE.padEnd(32, '0').slice(0, 32));

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + encrypted → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function encryptPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  try { return encrypt(phone); } catch { return null; }
}

export function decryptPhone(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try { return decrypt(encrypted); } catch { return null; }
}
