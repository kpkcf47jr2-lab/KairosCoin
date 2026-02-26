// ═══════════════════════════════════════════════════════
//  KAIROS TRADE — Service Worker v1
//  Offline Cache + Smart Caching Strategies
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'kairos-trade-v2';
const RUNTIME_CACHE = 'kairos-trade-runtime-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// External domains to never cache
const BYPASS_HOSTS = [
  'binance', 'coingecko', 'bscscan', 'onrender.com',
  'turso', 'walletconnect', 'infura', 'publicnode', 'ankr',
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

  // Skip non-GET and external APIs
  if (request.method !== 'GET') return;
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;

  // Network-first for scripts/styles (prevents stale build artifacts)
  // Cache-first only for images and fonts (stable across deploys)
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' || request.destination === 'style')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || fetch(request)))
    );
    return;
  }

  if (
    url.origin === self.location.origin &&
    (request.destination === 'image' ||
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
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
});
