import crypto from 'crypto';

/** Read the existing base64 key when encryption is used, never at build time. */
function getEncryptionKey(): Buffer {
  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) throw new Error('ENCRYPTION_KEY environment variable is required');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
  return key;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * Encrypt sensitive data (tokens, API keys, etc.)
 * Returns base64-encoded string: iv:tag:ciphertext
 * 
 * NEVER log the plaintext or decrypted values
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all base64)
  const ivBase64 = iv.toString('base64');
  const tagBase64 = tag.toString('base64');
  const encryptedBase64 = encrypted.toString('base64');

  return `${ivBase64}:${tagBase64}:${encryptedBase64}`;
}

/**
 * Decrypt encrypted data
 * Input format: iv:tag:ciphertext (all base64)
 * 
 * NEVER log the decrypted value
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, tagBase64, encryptedBase64] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Test encryption/decryption roundtrip
 * Used for unit tests
 */
export function testEncryption(plaintext: string): boolean {
  try {
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    return decrypted === plaintext;
  } catch {
    return false;
  }
}
