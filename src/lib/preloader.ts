/**
 * Preloader — starts loading heavy assets during splash/login screens
 * so the app is instant when the user authenticates.
 *
 * Called from App.tsx BEFORE auth completes. Loads:
 * 1. TMDB data chunk (~2MB gzip)
 * 2. Logo map chunk (~84KB gzip)
 * 3. Homepage page chunk
 * 4. VPS health data
 * 5. Probe results
 *
 * Everything is cached by the dynamic import() mechanism and browser cache.
 * When the real components request this data, it's already in memory.
 */

let preloadStarted = false;

export function startPreload() {
  if (preloadStarted) return;
  preloadStarted = true;

  // Stagger loads to not block the login UI rendering
  // Phase 1: Lightweight stuff (immediate)
  setTimeout(() => {
    // Preload VPS health + probe data
    fetch('https://stream.zionsynapse.online/channels.json', { signal: AbortSignal.timeout(5000) }).catch(() => {});
    fetch('https://stream.zionsynapse.online/probe-results.json', { signal: AbortSignal.timeout(5000) }).catch(() => {});
  }, 200);

  // Phase 2: TMDB data (1s — now JSON via fetch, doesn't block main thread)
  setTimeout(() => {
    fetch('/tmdb-data.json').catch(() => {});  // Browser caches the response
  }, 1000);

  // Phase 2b: Free channels (1.5s — 1.4MB JSON, preload for instant merge)
  setTimeout(() => {
    fetch('/free-channels.json').catch(() => {});
  }, 1500);

  // Phase 3: Logo map (1000ms — after TMDB starts)
  setTimeout(() => {
    import('@/lib/logo-map.generated').catch(() => {});
  }, 1000);

  // Phase 4: Page chunks (1500ms — login UI is rendered)
  setTimeout(() => {
    import('@/pages/HomePage').catch(() => {});
    import('@/pages/LiveTVPage').catch(() => {});
  }, 1500);
}

/**
 * Preload after auth succeeds — warm up the API cache
 * Called with credentials after login, before homepage renders
 */
export function preloadApiData(proxyUrl: string, username: string, password: string) {
  const base = `${proxyUrl}/api?u=${username}&p=${password}`;

  // Preload category lists (small, fast, cached by VPS for 5 min)
  fetch(`${base}&action=get_live_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  fetch(`${base}&action=get_vod_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  fetch(`${base}&action=get_series_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});

  // Preload homepage collection categories (the ones that load on mount)
  const hotCats = ['749', '597', '234', '85', '353', '5'];
  for (const cat of hotCats) {
    fetch(`${base}&action=get_live_streams&category_id=${cat}`, { signal: AbortSignal.timeout(10000) }).catch(() => {});
  }
}
