const CACHE_NAME = 'tivi-plus-v4';

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

  // Skip streaming/API/external requests entirely
  if (url.includes('stream.zionsynapse.online')) return;
  if (url.includes('datahub11.com')) return;
  if (url.includes('starshare.cx')) return;
  if (url.includes('player_api.php')) return;
  if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.mp4')) return;
  if (url.includes('webhop.live')) return;
  if (url.includes('supabase.co')) return;
  if (url.includes('image.tmdb.org')) return;

  // SPA navigation — network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
          return r;
        })
        .catch(() => caches.match('/index.html').then(r => r || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Only cache same-origin requests
  if (!url.startsWith(self.location.origin)) return;

  // Hashed assets (JS/CSS chunks) — CACHE FIRST (they never change, hash in filename)
  if (url.includes('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
          return r;
        });
      })
    );
    return;
  }

  // Fonts — CACHE FIRST (rarely change)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
          return r;
        });
      })
    );
    return;
  }

  // Logos/images — CACHE FIRST
  if (url.includes('/logos/') || url.match(/\.(png|webp|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
          return r;
        });
      })
    );
    return;
  }

  // JSON data (probe-results, tmdb-data) — NETWORK FIRST (may update)
  if (url.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
          return r;
        })
        .catch(() => caches.match(event.request).then(r => r || new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // Everything else — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((r) => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c)); }
        return r;
      })
      .catch(() => caches.match(event.request))
  );
});
