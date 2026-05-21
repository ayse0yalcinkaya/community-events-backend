import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const AES_KEY = process.env.AES_SECRET_KEY ? Buffer.from(process.env.AES_SECRET_KEY, 'hex') : Buffer.alloc(0);

function getKey(): Buffer {
  if (AES_KEY.length !== 32) {
    throw new Error('AES_SECRET_KEY must be 32 bytes (64 hex chars)');
  }
  return AES_KEY;
}

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}
