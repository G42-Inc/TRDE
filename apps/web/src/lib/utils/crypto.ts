/**
 * Cryptographic utilities for encrypting sensitive data at rest
 * 
 * Uses AES-256-GCM for authenticated encryption.
 * Requires API_KEY_ENCRYPTION_SECRET environment variable (32 bytes / 64 hex chars)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variable
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is not set');
  }
  
  // If the secret is hex-encoded (64 chars = 32 bytes)
  if (secret.length === 64 && /^[a-fA-F0-9]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  
  // If the secret is a raw string, hash it to get a consistent 32-byte key
  // This allows using any length secret string
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string containing: IV + AuthTag + Ciphertext
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted data
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted string
 * 
 * @param encryptedData - Base64-encoded encrypted data (IV + AuthTag + Ciphertext)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Check if the encryption secret is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.API_KEY_ENCRYPTION_SECRET;
}

/**
 * Generate a new random encryption key (for setup)
 * Returns a 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
