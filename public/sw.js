// STABLE cache name — NOT regenerated per build. The cache now PERSISTS across
// deploys: HTML + JSON are network-first (always fresh), hashed /assets/ chunks
// are immutable (new names = new entries, unchanged = cache hit), logos/images
// are cached forever. So a deploy only re-downloads what actually changed —
// blazing + data-saving. Bump this string ONLY for a deliberate hard cache reset.
const CACHE_NAME = 'tivi-cache-stable-1';
// Dedicated, BOUNDED image cache (poster art + channel logos). Kept separate
// from the shell cache so it can be LRU-capped without ever evicting shell or
// JS/CSS asset entries. Once a logo/poster is fetched it's served from here
// instantly forever — zero refetch on scroll / nav / reopen.
const IMG_CACHE = 'tivi-img-stable-1';
const IMG_CACHE_MAX = 450; // hard cap — evict oldest beyond this (storage-safe)

// APP-SHELL PRECACHE — the static UI + design + catalog. Precached at install
// so the app opens INSTANTLY and the channel list/design are browsable OFFLINE.
// Only stable, non-hashed files: hashed /assets/* chunks are runtime cache-first
// and HTML stays network-first, so the force-update version gate still controls
// updates (a new version clears caches + re-precaches the fresh shell).
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tivi-curated.json',
  '/streamore-locked.json',
  '/tivi-192.png',
  '/tivi-512.png',
];

// --- INSTALL ---
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ' + CACHE_NAME);
  self.skipWaiting();
  // Resilient precache: each entry added independently so a single 404 can
  // never abort the install (which would leave the app uncontrolled).
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(SHELL.map((u) => cache.add(u).catch(() => {})))
    )
  );
});

// --- ACTIVATE ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ' + CACHE_NAME);
  event.waitUntil(
    caches.keys().then((keys) => {
      const old = keys.filter((k) => k !== CACHE_NAME && k !== IMG_CACHE);
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

// Trim the image cache back to its cap, evicting the OLDEST entries first.
// cache.keys() preserves insertion order, so the front of the list is oldest.
function trimImageCache() {
  caches.open(IMG_CACHE).then((cache) =>
    cache.keys().then((keys) => {
      const over = keys.length - IMG_CACHE_MAX;
      for (let i = 0; i < over; i++) cache.delete(keys[i]);
    })
  );
}

// Cache-first against the dedicated, bounded IMG_CACHE. Once an image is stored
// it's served locally forever (until LRU-evicted). Network only on first miss.
function imageCacheFirst(request) {
  return caches.open(IMG_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
          trimImageCache();
        }
        return response;
      });
    })
  ).catch(() => caches.match(request));
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

  // --- TMDB IMAGES: cache-first via bounded image cache (static poster art) ---
  if (url.includes('image.tmdb.org')) {
    event.respondWith(imageCacheFirst(request));
    return;
  }

  // --- CHANNEL ICONS: cache-first via bounded image cache (logos don't change) ---
  if (url.includes('/icons/') || (url.includes('supabase.co') && url.includes('channel-icons'))) {
    event.respondWith(imageCacheFirst(request));
    return;
  }

  // --- LOGO / IMAGE CDNs: cache-first REGARDLESS of origin. Channel logos come
  // from external CDNs (tv-logo GitHub, etc.) and were re-downloading on every
  // mount/scroll because the same-origin gate below skipped them. They're
  // immutable art — cache once. Kills the "frenetic reload" + saves data.
  if (
    url.includes('raw.githubusercontent.com') ||
    /\.(png|webp|svg|jpg|jpeg|ico|gif)(\?|$)/i.test(url)
  ) {
    event.respondWith(imageCacheFirst(request));
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

    // --- IMAGES/LOGOS: cache-first via bounded image cache ---
    if (url.includes('/logos/') || url.match(/\.(png|webp|svg|ico|jpg|jpeg)$/)) {
      event.respondWith(imageCacheFirst(request));
      return;
    }

    // --- EVERYTHING ELSE: network-first with cache fallback ---
    event.respondWith(networkFirstThenCache(request));

  } catch (err) {
    // Safety net: if anything throws synchronously, let the browser handle it
    console.error('[SW] Fetch handler error:', err);
  }
});

// --- PUSH NOTIFICATIONS ---
// Payload shape comes from the `send-push` Supabase Edge Function:
//   { id, title, body, url, app, tag }
self.addEventListener('push', (event) => {
  let data = { title: 'Tivi+', body: 'New notification', url: '/', tag: 'dash-notification' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (err) {
    console.warn('[SW] Failed to parse push data:', err);
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'dash-notification',
      data: data.url || '/',
      vibrate: [100, 50, 100],
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
