// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Service Worker
//  Cache-first for assets, network-first for API calls
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'kairos-wallet-v2';
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

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip external API calls (CoinGecko, RPCs, block explorers)
  if (
    url.hostname.includes('coingecko') ||
    url.hostname.includes('bscscan') ||
    url.hostname.includes('etherscan') ||
    url.hostname.includes('polygonscan') ||
    url.hostname.includes('arbiscan') ||
    url.hostname.includes('snowscan') ||
    url.hostname.includes('basescan') ||
    url.hostname.includes('walletconnect') ||
    url.hostname.includes('infura') ||
    url.hostname.includes('publicnode') ||
    url.hostname.includes('ankr') ||
    url.hostname.includes('cloudflare')
  ) {
    return;
  }

  // Cache-first for local assets (JS, CSS, images, fonts)
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
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML (app shell)
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
});
