import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must decode to 32 bytes');

  return key;
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(payload) {
  const buffer = Buffer.from(payload, 'base64');

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
