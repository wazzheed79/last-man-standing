// Last Man Standing — Service Worker
// v2: navigation requests bypass the HTTP cache so a deploy shows up on
// installed home-screen apps. The latest successful response is still stored
// for offline use. Push is not handled here (reminders use the page
// Notification API); non-GET and cross-origin requests are left untouched.
const CACHE_NAME = 'lms-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/badge.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const hadPreviousCache = keys.some((key) => key !== CACHE_NAME);
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      // A phone already open on the previous worker will not reload by itself.
      // Navigate after activate finishes — waiting on navigate inside this
      // event deadlocks, because the reload is served by this worker.
      if (!hadPreviousCache) return;
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      setTimeout(() => {
        windows.forEach((client) => {
          if (!client.url || typeof client.navigate !== 'function') return;
          client.navigate(client.url).catch(() => {});
        });
      }, 50);
    })()
  );
});

// Network-first. Documents skip the HTTP cache so an update is visible without
// clearing site data, then the fresh response is kept for offline.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/auth/')) return;

  const isDocument = request.mode === 'navigate' || request.destination === 'document';

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, isDocument ? { cache: 'no-store' } : undefined);
        if (response && response.ok && response.type === 'basic') {
          const cacheKey = isDocument ? new Request(url.pathname + url.search) : request;
          cache.put(cacheKey, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const cached = await caches.match(isDocument ? url.pathname + url.search : request);
        if (cached) return cached;
        if (isDocument) {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw error;
      }
    })()
  );
});
