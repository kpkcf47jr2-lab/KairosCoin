// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Encryption Service
//  AES-256-GCM encryption using Web Crypto API
//  Superior to MetaMask: PBKDF2 with 600k iterations
// ═══════════════════════════════════════════════════════

import { ENCRYPTION_ALGORITHM, KEY_DERIVATION_ITERATIONS, SALT_LENGTH, IV_LENGTH } from '../constants/chains';

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
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
      iterations: KEY_DERIVATION_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {string} password - User's password
 * @returns {string} Base64-encoded encrypted data (salt + iv + ciphertext)
 */
export async function encrypt(plaintext, password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data with AES-256-GCM
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @param {string} password - User's password
 * @returns {string} Decrypted plaintext
 */
export async function decrypt(encryptedBase64, password) {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Hash a password for quick comparison (not for encryption)
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'kairos_wallet_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate secure random bytes
 */
export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}
