// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Service Worker v3
//  Push Notifications + Offline Cache + Background Sync
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'kairos-wallet-v3';
const RUNTIME_CACHE = 'kairos-runtime-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/logo-128.png',
  '/icons/logo-192.png',
  '/icons/logo-512.png',
  '/icons/logo-180.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
];

// External domains to never cache
const BYPASS_HOSTS = [
  'coingecko', 'bscscan', 'etherscan', 'polygonscan', 'arbiscan',
  'snowscan', 'basescan', 'walletconnect', 'infura', 'publicnode',
  'ankr', 'cloudflare', 'onrender.com', 'turso',
];

// ── Install — Pre-cache static shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate — Clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Smart caching strategies ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip external APIs/RPCs
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML (app shell)
  if (
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
});

// ═══════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  let data = {
    title: 'Kairos Wallet',
    body: 'Nueva notificación',
    icon: '/icons/logo-192.png',
    badge: '/icons/favicon-32.png',
    tag: 'kairos-default',
    data: {},
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/logo-192.png',
    badge: data.badge || '/icons/favicon-32.png',
    tag: data.tag || `kairos-${Date.now()}`,
    vibrate: [100, 50, 100],
    renotify: !!data.tag,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now(),
    silent: data.silent || false,
  };

  // Add default actions based on notification type
  if (data.type === 'tx_received') {
    options.actions = [
      { action: 'view', title: 'Ver transacción' },
      { action: 'dismiss', title: 'Cerrar' },
    ];
  } else if (data.type === 'price_alert') {
    options.actions = [
      { action: 'trade', title: 'Operar' },
      { action: 'dismiss', title: 'Cerrar' },
    ];
  } else if (data.type === 'security') {
    options.actions = [
      { action: 'review', title: 'Revisar' },
    ];
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification Click Handler ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  let targetUrl = '/';

  switch (action) {
    case 'view':
      targetUrl = notifData.txHash ? `/?screen=txdetail&hash=${notifData.txHash}` : '/?screen=history';
      break;
    case 'trade':
      targetUrl = '/?screen=swap';
      break;
    case 'review':
      targetUrl = '/?screen=approvals';
      break;
    default:
      targetUrl = notifData.url || '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action,
            data: notifData,
            url: targetUrl,
          });
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Notification Close Handler ──
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'NOTIFICATION_DISMISSED',
        data: notifData,
      });
    });
  });
});

// ── Background Sync ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch {
    // Silently fail
  }
}

// ── Message handler from main app ──
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SHOW_LOCAL_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: '/icons/logo-192.png',
      badge: '/icons/favicon-32.png',
      vibrate: [100, 50, 100],
      ...options,
    });
  }
});
