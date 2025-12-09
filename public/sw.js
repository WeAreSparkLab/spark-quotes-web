// public/sw.js
const CACHE_VERSION = 'v10-2025-12-09';        // bump every time you deploy
const RUNTIME = `spark-runtime-${CACHE_VERSION}`;
const ASSET_CACHE = `spark-assets-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Take control immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k !== RUNTIME && k !== ASSET_CACHE ? caches.delete(k) : Promise.resolve()))
    );
    // Control all clients without reload
    await self.clients.claim();
  })());
});

// Helper: identify navigation requests (HTML)
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' &&
          request.headers.get('accept') &&
          request.headers.get('accept').includes('text/html'));
}

// Network-first for HTML; Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Allow bypass: ?sw-bypass=1
  if (new URL(request.url).search.includes('sw-bypass=1')) return;

  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(RUNTIME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(request);
        return cached || caches.match('/index.html') || Response.error();
      }
    })());
    return;
  }

  // Static assets: cache-first
  if (request.url.match(/\.(?:js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })());
  }
});
