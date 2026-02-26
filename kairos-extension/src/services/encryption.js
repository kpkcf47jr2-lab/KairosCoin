// Kairos Extension — Encryption Service
// AES-256-GCM via Web Crypto API with PBKDF2 key derivation

import { PBKDF2_ITERATIONS, IV_LENGTH, SALT_LENGTH } from '../constants/chains';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Derive an AES-256-GCM key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with a password
 * @param {string} data - JSON string to encrypt
 * @param {string} password - User password
 * @returns {string} Base64 encoded encrypted payload (salt + iv + ciphertext)
 */
export async function encrypt(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Concatenate: salt(16) + iv(12) + ciphertext
  const payload = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  payload.set(salt, 0);
  payload.set(iv, salt.length);
  payload.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...payload));
}

/**
 * Decrypt data with a password
 * @param {string} encryptedBase64 - Base64 encoded payload
 * @param {string} password - User password
 * @returns {string} Decrypted JSON string
 */
export async function decrypt(encryptedBase64, password) {
  const payload = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  const salt = payload.slice(0, SALT_LENGTH);
  const iv = payload.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = payload.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(decrypted);
}
