/**
 * Preloader — loads heavy assets during splash/login screens
 * so the app is instant when the user authenticates.
 *
 * Now signals readiness so the splash can wait for content.
 */

let preloadStarted = false;
let resolveReady: () => void;
export const preloadReady = new Promise<void>(r => { resolveReady = r; });

export function startPreload() {
  if (preloadStarted) return;
  preloadStarted = true;

  const loads: Promise<unknown>[] = [];

  // Phase 1: VPS health + probe (immediate)
  loads.push(
    fetch('https://stream.zionsynapse.online/health', { signal: AbortSignal.timeout(5000) }).catch(() => {}),
    fetch('/probe-results.json', { signal: AbortSignal.timeout(5000) }).catch(() => {}),
  );

  // Phase 2: TMDB data + free channels
  loads.push(
    fetch('/tmdb-data.json', { signal: AbortSignal.timeout(8000) }).catch(() => {}),
    fetch('/free-channels-curated.json', { signal: AbortSignal.timeout(5000) }).catch(() => {}),
  );

  // Phase 3: Page chunks
  loads.push(
    import('@/pages/HomePage').catch(() => {}),
    import('@/pages/LiveTVPage').catch(() => {}),
    import('@/lib/logo-map.generated').catch(() => {}),
  );

  // Signal ready when critical assets are loaded (or timeout)
  Promise.allSettled(loads).then(() => resolveReady());

  // Failsafe — resolve after 6s no matter what
  setTimeout(resolveReady, 6000);
}

/**
 * Preload after auth — warm up the API cache with credentials
 */
export function preloadApiData(proxyUrl: string, username: string, password: string) {
  const enc = (s: string) => encodeURIComponent(s);
  const base = `${proxyUrl}/api?u=${enc(username)}&p=${enc(password)}`;

  // Category lists (small, fast)
  fetch(`${base}&action=get_live_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  fetch(`${base}&action=get_vod_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  fetch(`${base}&action=get_series_categories`, { signal: AbortSignal.timeout(8000) }).catch(() => {});

  // Homepage hot categories
  const hotCats = ['749', '597', '234', '85', '353', '5'];
  for (const cat of hotCats) {
    fetch(`${base}&action=get_live_streams&category_id=${cat}`, { signal: AbortSignal.timeout(10000) }).catch(() => {});
  }
}
