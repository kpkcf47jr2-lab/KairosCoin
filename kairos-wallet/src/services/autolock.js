// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Auto-Lock Service
//  Inactivity timer + biometric auth (WebAuthn)
// ═══════════════════════════════════════════════════════

import { STORAGE_KEYS } from '../constants/chains';

const SETTINGS_KEY = STORAGE_KEYS.SETTINGS;

// Default auto-lock timeout (ms)
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let lockTimer = null;
let lockCallback = null;

/**
 * Get saved settings
 */
function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

/**
 * Get auto-lock timeout (ms)
 */
export function getAutoLockTimeout() {
  const settings = getSettings();
  return settings.autoLockTimeout ?? DEFAULT_TIMEOUT;
}

/**
 * Set auto-lock timeout (ms)
 * 0 = disabled
 */
export function setAutoLockTimeout(ms) {
  saveSettings({ autoLockTimeout: ms });
  resetInactivityTimer();
}

/**
 * Get auto-lock options for UI
 */
export function getAutoLockOptions() {
  return [
    { label: '1 minuto', value: 60000 },
    { label: '5 minutos', value: 300000 },
    { label: '15 minutos', value: 900000 },
    { label: '30 minutos', value: 1800000 },
    { label: '1 hora', value: 3600000 },
    { label: 'Nunca', value: 0 },
  ];
}

/**
 * Start the inactivity timer
 */
export function startInactivityTimer(onLock) {
  lockCallback = onLock;
  resetInactivityTimer();

  // Listen for user activity
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });

  // Also handle visibility change
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Stop the inactivity timer
 */
export function stopInactivityTimer() {
  clearTimeout(lockTimer);
  lockCallback = null;
  
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
  events.forEach(event => {
    document.removeEventListener(event, resetInactivityTimer);
  });
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Reset the timer on user activity
 */
function resetInactivityTimer() {
  clearTimeout(lockTimer);
  const timeout = getAutoLockTimeout();
  if (timeout > 0 && lockCallback) {
    lockTimer = setTimeout(() => {
      if (lockCallback) lockCallback();
    }, timeout);
  }
}

/**
 * Handle tab visibility (lock when tab is hidden for extended time)
 */
let hiddenTimestamp = null;
function handleVisibilityChange() {
  if (document.hidden) {
    hiddenTimestamp = Date.now();
  } else if (hiddenTimestamp) {
    const elapsed = Date.now() - hiddenTimestamp;
    const timeout = getAutoLockTimeout();
    if (timeout > 0 && elapsed >= timeout && lockCallback) {
      lockCallback();
    }
    hiddenTimestamp = null;
  }
}

// ── Biometric Authentication (WebAuthn) ──

const CREDENTIAL_KEY = 'kairos_biometric_credential';

/**
 * Check if biometric auth is available
 */
export function isBiometricAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

/**
 * Check if biometric is enrolled
 */
export function isBiometricEnrolled() {
  return !!localStorage.getItem(CREDENTIAL_KEY);
}

/**
 * Register biometric credential
 */
export async function enrollBiometric() {
  if (!isBiometricAvailable()) throw new Error('Biometría no disponible');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Kairos Wallet', id: window.location.hostname },
      user: {
        id: userId,
        name: 'kairos-user',
        displayName: 'Kairos Wallet User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  });

  if (!credential) throw new Error('Registro cancelado');

  // Store credential ID
  const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
  localStorage.setItem(CREDENTIAL_KEY, credentialId);
  saveSettings({ biometricEnabled: true });

  return true;
}

/**
 * Authenticate with biometric
 */
export async function authenticateBiometric() {
  if (!isBiometricEnrolled()) throw new Error('Biometría no configurada');

  const credentialId = localStorage.getItem(CREDENTIAL_KEY);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const rawId = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        id: rawId,
        type: 'public-key',
        transports: ['internal'],
      }],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return !!assertion;
}

/**
 * Remove biometric enrollment
 */
export function removeBiometric() {
  localStorage.removeItem(CREDENTIAL_KEY);
  saveSettings({ biometricEnabled: false });
}

/**
 * Check if biometric is enabled in settings
 */
export function isBiometricEnabled() {
  const settings = getSettings();
  return settings.biometricEnabled === true && isBiometricEnrolled();
}
