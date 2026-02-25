// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Push Notification Service
//  Web Push API + Local Notifications + Preferences
// ═══════════════════════════════════════════════════════

const API_URL = 'https://kairos-api-u6k5.onrender.com';
const PUSH_PREFS_KEY = 'kairos_push_preferences';
const PUSH_SUB_KEY = 'kairos_push_subscription';

// VAPID public key (generated server-side, stored here for subscription)
// This will be fetched from the backend on first use
let VAPID_PUBLIC_KEY = null;

// ── Default notification preferences ──
const DEFAULT_PREFERENCES = {
  enabled: true,
  categories: {
    transactions: true,     // Incoming/outgoing tx notifications
    priceAlerts: true,      // Price alert triggers
    security: true,         // Security warnings (approvals, suspicious activity)
    staking: true,          // Staking rewards & vault yield updates
    system: true,           // App updates, maintenance
    marketing: false,       // Promotional notifications (opt-in)
  },
  quiet: {
    enabled: false,
    start: '22:00',         // Quiet hours start
    end: '08:00',           // Quiet hours end
  },
  sound: true,
  vibrate: true,
  badge: true,
};

// ═══════════════════════════════════════════════════════
//  PERMISSION & REGISTRATION
// ═══════════════════════════════════════════════════════

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} true if granted
 */
export async function requestPermission() {
  if (!isPushSupported()) return false;

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    // Auto-subscribe after permission granted
    await subscribeToPush();
  }
  return result === 'granted';
}

/**
 * Get or fetch VAPID public key from backend
 */
async function getVapidKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;

  try {
    const res = await fetch(`${API_URL}/api/push/vapid-key`);
    if (res.ok) {
      const data = await res.json();
      VAPID_PUBLIC_KEY = data.publicKey;
      return VAPID_PUBLIC_KEY;
    }
  } catch (err) {
    console.warn('Could not fetch VAPID key:', err.message);
  }

  // Fallback: use locally generated key pair (less secure, but functional)
  return null;
}

/**
 * Subscribe to push notifications
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeToPush() {
  if (!isPushSupported() || Notification.permission !== 'granted') return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      savePushSubscription(existing);
      return existing;
    }

    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      console.warn('No VAPID key available, using local notifications only');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Save locally
    savePushSubscription(subscription);

    // Register with backend
    await registerSubscription(subscription);

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      // Notify backend
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
    }
    localStorage.removeItem(PUSH_SUB_KEY);
  } catch (err) {
    console.error('Unsubscribe failed:', err);
  }
}

/**
 * Register subscription with backend
 */
async function registerSubscription(subscription) {
  const address = localStorage.getItem('kairos_active_address') || '';
  try {
    await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        address,
        preferences: getPreferences(),
      }),
    });
  } catch (err) {
    console.warn('Failed to register push subscription with backend:', err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  LOCAL NOTIFICATIONS (Fallback + Immediate)
// ═══════════════════════════════════════════════════════

/**
 * Show a local notification (doesn't require push subscription)
 */
export async function showLocalNotification(title, options = {}) {
  if (Notification.permission !== 'granted') return false;

  const prefs = getPreferences();

  // Check quiet hours
  if (prefs.quiet.enabled && isQuietHours(prefs.quiet.start, prefs.quiet.end)) {
    return false;
  }

  // Check category preference
  if (options.category && prefs.categories[options.category] === false) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({
      type: 'SHOW_LOCAL_NOTIFICATION',
      title,
      options: {
        body: options.body || '',
        icon: options.icon || '/icons/logo-192.png',
        badge: '/icons/favicon-32.png',
        tag: options.tag || `kairos-${Date.now()}`,
        data: options.data || {},
        vibrate: prefs.vibrate ? [100, 50, 100] : undefined,
        silent: !prefs.sound,
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
      },
    });
    return true;
  } catch {
    // Fallback: regular Notification API
    try {
      new Notification(title, {
        body: options.body || '',
        icon: '/icons/logo-192.png',
        silent: !prefs.sound,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════
//  NOTIFICATION TRIGGERS (called from wallet events)
// ═══════════════════════════════════════════════════════

/**
 * Notify on incoming transaction
 */
export function notifyTransactionReceived({ from, amount, symbol, txHash, chainName }) {
  return showLocalNotification(`💰 ${amount} ${symbol} recibidos`, {
    body: `De ${from.slice(0, 8)}...${from.slice(-6)} en ${chainName}`,
    tag: `tx-${txHash}`,
    category: 'transactions',
    data: { type: 'tx_received', txHash, from, amount, symbol },
    actions: [
      { action: 'view', title: 'Ver' },
    ],
  });
}

/**
 * Notify on outgoing transaction confirmed
 */
export function notifyTransactionSent({ to, amount, symbol, txHash, chainName }) {
  return showLocalNotification(`✅ ${amount} ${symbol} enviados`, {
    body: `A ${to.slice(0, 8)}...${to.slice(-6)} en ${chainName}`,
    tag: `tx-${txHash}`,
    category: 'transactions',
    data: { type: 'tx_sent', txHash, to, amount, symbol },
  });
}

/**
 * Notify on transaction failure
 */
export function notifyTransactionFailed({ amount, symbol, error }) {
  return showLocalNotification(`❌ Transacción fallida`, {
    body: `${amount} ${symbol} — ${error || 'Error desconocido'}`,
    tag: `tx-fail-${Date.now()}`,
    category: 'transactions',
    data: { type: 'tx_failed' },
  });
}

/**
 * Notify on price alert trigger
 */
export function notifyPriceAlert({ symbol, price, condition, targetPrice }) {
  const direction = condition === 'above' ? '📈 superó' : '📉 bajó de';
  return showLocalNotification(`🔔 ${symbol} ${direction} $${targetPrice}`, {
    body: `Precio actual: $${parseFloat(price).toFixed(4)}`,
    tag: `price-${symbol}-${targetPrice}`,
    category: 'priceAlerts',
    data: { type: 'price_alert', symbol, price },
    actions: [
      { action: 'trade', title: 'Operar' },
    ],
  });
}

/**
 * Notify on security event
 */
export function notifySecurityEvent({ title, message, severity = 'warning' }) {
  return showLocalNotification(`🛡️ ${title}`, {
    body: message,
    tag: `security-${Date.now()}`,
    category: 'security',
    requireInteraction: severity === 'critical',
    data: { type: 'security', severity },
    actions: [
      { action: 'review', title: 'Revisar' },
    ],
  });
}

/**
 * Notify on staking/vault reward
 */
export function notifyStakingReward({ protocol, amount, symbol }) {
  return showLocalNotification(`🌾 Yield de ${protocol}`, {
    body: `+${amount} ${symbol} ganados`,
    tag: `staking-${protocol}-${Date.now()}`,
    category: 'staking',
    data: { type: 'staking_reward', protocol, amount, symbol },
  });
}

// ═══════════════════════════════════════════════════════
//  PREFERENCES
// ═══════════════════════════════════════════════════════

/**
 * Get notification preferences
 */
export function getPreferences() {
  try {
    const stored = localStorage.getItem(PUSH_PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Update notification preferences
 */
export function updatePreferences(updates) {
  const current = getPreferences();
  const merged = {
    ...current,
    ...updates,
    categories: { ...current.categories, ...(updates.categories || {}) },
    quiet: { ...current.quiet, ...(updates.quiet || {}) },
  };
  localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(merged));

  // Sync with backend if subscribed
  syncPreferencesWithBackend(merged);

  return merged;
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences() {
  localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  return DEFAULT_PREFERENCES;
}

async function syncPreferencesWithBackend(prefs) {
  const sub = getSavedSubscription();
  if (!sub?.endpoint) return;

  try {
    await fetch(`${API_URL}/api/push/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        preferences: prefs,
      }),
    });
  } catch { /* silent fail */ }
}

// ═══════════════════════════════════════════════════════
//  SW MESSAGE LISTENER SETUP
// ═══════════════════════════════════════════════════════

/**
 * Initialize push notification listeners.
 * Call this once from App.jsx on mount.
 */
export function initPushListeners(navigate) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, action, data, url } = event.data || {};

    if (type === 'NOTIFICATION_CLICKED') {
      // Navigate within the app based on notification action
      if (url && navigate) {
        const params = new URLSearchParams(url.split('?')[1] || '');
        const screen = params.get('screen');
        if (screen) {
          navigate(screen, data);
        }
      }
    }

    if (type === 'SYNC_COMPLETE') {
      console.log('[Push] Background sync complete');
    }
  });
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isQuietHours(start, end) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight quiet hours (e.g., 22:00 — 08:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function savePushSubscription(subscription) {
  try {
    localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(subscription.toJSON()));
  } catch { /* ignore */ }
}

function getSavedSubscription() {
  try {
    return JSON.parse(localStorage.getItem(PUSH_SUB_KEY) || 'null');
  } catch { return null; }
}

/**
 * Get push subscription status summary
 */
export function getPushStatus() {
  const supported = isPushSupported();
  const permission = getPermissionStatus();
  const subscription = getSavedSubscription();
  const prefs = getPreferences();

  return {
    supported,
    permission,
    subscribed: !!subscription,
    preferences: prefs,
    endpoint: subscription?.endpoint?.slice(0, 50) + '...' || null,
  };
}
