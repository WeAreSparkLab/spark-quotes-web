/* Spark Quotes PWA Service Worker (minimal) */
const CACHE = 'sq-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Stale-while-revalidate for GET requests */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await fetch(event.request);
      cache.put(event.request, net.clone());
      return net;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw new Error('Offline and not cached');
    }
  })());
});
