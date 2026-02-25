/**
 * keyVault.js — AES-256-GCM encryption for private keys
 * Uses Web Crypto API (SubtleCrypto) with PBKDF2 key derivation.
 * 
 * NEVER store raw private keys — always encrypt with user's password first.
 * The encrypted blob is safe to store on server or localStorage.
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP recommended minimum
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM standard nonce size
const KEY_LENGTH = 256; // AES-256

/**
 * Derive an AES-256 key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string with a password.
 * Returns a base64-encoded string containing: salt + iv + ciphertext
 * Format: "v1:" prefix for versioning, then base64(salt|iv|ciphertext)
 */
export async function encrypt(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  // Concatenate salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return 'v1:' + btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an encrypted string with a password.
 * Expects the "v1:" prefixed format from encrypt().
 */
export async function decrypt(encryptedStr, password) {
  if (!encryptedStr.startsWith('v1:')) {
    throw new Error('Unknown encryption format');
  }

  const raw = encryptedStr.slice(3);
  const combined = Uint8Array.from(atob(raw), c => c.charCodeAt(0));

  const salt = combined.slice(0, SALT_BYTES);
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = combined.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(password, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Check if an encryptedKey is legacy (plain btoa) or properly encrypted (v1:).
 * Legacy keys are just base64-encoded private keys starting with "0x".
 */
export function isLegacyKey(encryptedKey) {
  if (!encryptedKey) return false;
  if (encryptedKey.startsWith('v1:')) return false;
  try {
    const decoded = atob(encryptedKey);
    return decoded.startsWith('0x');
  } catch {
    return false;
  }
}

/**
 * Decrypt a key — handles both legacy (btoa) and v1 encrypted keys.
 * For legacy keys, returns the decoded key and sets needsMigration flag.
 */
export async function decryptKey(encryptedKey, password) {
  if (!encryptedKey) return { privateKey: null, needsMigration: false };

  // Legacy btoa key — just decode it
  if (isLegacyKey(encryptedKey)) {
    return { privateKey: atob(encryptedKey), needsMigration: true };
  }

  // Properly encrypted key
  if (encryptedKey.startsWith('v1:')) {
    const privateKey = await decrypt(encryptedKey, password);
    return { privateKey, needsMigration: false };
  }

  return { privateKey: null, needsMigration: false };
}

/**
 * Migrate a legacy key to proper encryption.
 * Returns the new encrypted key string.
 */
export async function migrateLegacyKey(legacyEncryptedKey, password) {
  const privateKey = atob(legacyEncryptedKey);
  return encrypt(privateKey, password);
}
