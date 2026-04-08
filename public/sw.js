const CACHE_NAME = 'tivi-cache-v1775645649621';

// --- INSTALL ---
self.addEventListener('install', () => {
  console.log('[SW] Installing ' + CACHE_NAME);
  self.skipWaiting();
});

// --- ACTIVATE ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ' + CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      const old = keys.filter((k) => k !== CACHE_NAME);
      if (old.length) {
        console.log('[SW] Purging old caches:', old.join(', '));
        return Promise.all(old.map((k) => caches.delete(k))).then(() => {
          // Only signal update when replacing an old version, not on first install
          self.clients.matchAll({ type: 'window' }).then((tabs) => {
            console.log('[SW] Signaling ' + tabs.length + ' tab(s) to reload');
            tabs.forEach((tab) => tab.postMessage({ type: 'SW_UPDATED' }));
          });
        });
      }
      console.log('[SW] Fresh install — no update signal');
    })
  );
  self.clients.claim();
});

// --- HELPERS ---

function cacheFirstThenNetwork(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  }).catch(() => caches.match(request));
}

function networkFirstThenCache(request, fallbackBody) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  }).catch(() =>
    caches.match(request).then((cached) => {
      if (cached) return cached;
      if (fallbackBody !== undefined) {
        return new Response(fallbackBody, {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('Offline', { status: 503 });
    })
  );
}

// --- FETCH ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // --- NETWORK-ONLY: version gate (must always be fresh) ---
  if (url.includes('version.json')) return;

  // --- NETWORK-ONLY: API calls, streaming, external services ---
  // Never cache these — they are live data or stream segments
  if (
    url.includes('stream.zionsynapse.online') ||
    url.includes('supabase.co') ||
    url.includes('datahub11.com') ||
    url.includes('starshare.cx') ||
    url.includes('player_api.php') ||
    url.includes('webhop.live') ||
    url.includes('.m3u8') ||
    url.includes('.ts') ||
    url.includes('.mp4')
  ) {
    return; // Let browser handle natively — no SW involvement
  }

  // --- TMDB IMAGES: cache-first (static poster art, rarely changes) ---
  if (url.includes('image.tmdb.org')) {
    event.respondWith(cacheFirstThenNetwork(request));
    return;
  }

  // --- CHANNEL ICONS: cache-first (logos don't change) ---
  if (url.includes('/icons/') || (url.includes('supabase.co') && url.includes('channel-icons'))) {
    event.respondWith(cacheFirstThenNetwork(request));
    return;
  }

  try {
    // --- HTML / NAVIGATION: network-first with cache fallback ---
    if (request.mode === 'navigate') {
      event.respondWith(
        networkFirstThenCache(request).catch(
          () => caches.match('/index.html').then(
            (r) => r || new Response('Offline', { status: 503 })
          )
        )
      );
      return;
    }

    // Only cache same-origin from here on
    if (!url.startsWith(self.location.origin)) return;

    // --- LIVE DATA: network-only (curator + vee change frequently, must be fresh) ---
    if (url.includes('curator.json') || url.includes('vee.json')) {
      event.respondWith(
        fetch(request).catch(
          () => new Response('{}', {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      return;
    }

    // --- JSON DATA FILES: network-first (probe, tmdb, free-channels) ---
    if (url.endsWith('.json') && !url.includes('manifest.json')) {
      event.respondWith(
        networkFirstThenCache(request, '{}').catch(
          () => new Response('{}', {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      return;
    }

    // --- STATIC ASSETS: cache-first (hashed filenames, never change) ---
    // JS/CSS chunks in /assets/
    if (url.includes('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
      event.respondWith(cacheFirstThenNetwork(request));
      return;
    }

    // --- FONTS: cache-first (rarely change) ---
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
      event.respondWith(cacheFirstThenNetwork(request));
      return;
    }

    // --- IMAGES/LOGOS: cache-first ---
    if (url.includes('/logos/') || url.match(/\.(png|webp|svg|ico|jpg|jpeg)$/)) {
      event.respondWith(cacheFirstThenNetwork(request));
      return;
    }

    // --- EVERYTHING ELSE: network-first with cache fallback ---
    event.respondWith(networkFirstThenCache(request));

  } catch (err) {
    // Safety net: if anything throws synchronously, let the browser handle it
    console.error('[SW] Fetch handler error:', err);
  }
});
