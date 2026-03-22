const CACHE_NAME = 'tivi-plus-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;

  // Skip ALL external and streaming requests
  if (url.includes('stream.zionsynapse.online')) return;
  if (url.includes('datahub11.com')) return;
  if (url.includes('starshare.cx')) return;
  if (url.includes('player_api.php')) return;
  if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.mp4')) return;
  if (url.includes('webhop.live')) return;

  // SPA navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  // Static assets only
  if (url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).then((r) => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
        return r;
      }).catch(() => caches.match(event.request))
    );
  }
});
