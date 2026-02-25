// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Cloud Backup Service
//  Encrypted vault backup to Kairos API
//  Double encryption: local AES-256-GCM + server-side
// ═══════════════════════════════════════════════════════

const API_HOST = 'https://kairos-api-u6k5.onrender.com';

/**
 * Create an encrypted cloud backup of the vault
 * The vault is already encrypted locally with AES-256-GCM
 * We add a second layer of encryption with the backup password
 */
export async function createBackup(walletAddress, encryptedVault, backupPassword) {
  if (!walletAddress || !encryptedVault || !backupPassword) {
    throw new Error('Faltan datos para crear el backup');
  }

  // Double-encrypt: wrap the already-encrypted vault with the backup password
  const doubleEncrypted = await doubleEncrypt(encryptedVault, backupPassword);

  const res = await fetch(`${API_HOST}/api/wallet/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      encryptedVault: doubleEncrypted,
      timestamp: Date.now(),
      version: 1,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear backup');
  return data;
}

/**
 * Restore vault from cloud backup
 */
export async function restoreBackup(walletAddress, backupPassword) {
  if (!walletAddress || !backupPassword) {
    throw new Error('Faltan datos para restaurar');
  }

  const res = await fetch(`${API_HOST}/api/wallet/backup?address=${walletAddress}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Backup no encontrado');

  if (!data.encryptedVault) throw new Error('No hay backup disponible');

  // Decrypt the double-encryption layer
  const vault = await doubleDecrypt(data.encryptedVault, backupPassword);
  return { vault, timestamp: data.timestamp, version: data.version };
}

/**
 * Check if a backup exists for an address
 */
export async function checkBackupExists(walletAddress) {
  try {
    const res = await fetch(`${API_HOST}/api/wallet/backup/check?address=${walletAddress}`);
    const data = await res.json();
    return data.exists ? { exists: true, timestamp: data.timestamp } : { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Delete cloud backup
 */
export async function deleteBackup(walletAddress, backupPassword) {
  const res = await fetch(`${API_HOST}/api/wallet/backup`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, backupPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar backup');
  return data;
}

/* ─── Double Encryption Helpers (AES-256-GCM via Web Crypto) ─── */

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 300000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function doubleEncrypt(data, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(typeof data === 'string' ? data : JSON.stringify(data))
  );

  // Pack: salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...result));
}

async function doubleDecrypt(base64Data, password) {
  const raw = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Contraseña de backup incorrecta');
  }
}
