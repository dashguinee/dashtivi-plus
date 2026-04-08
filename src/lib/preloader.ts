/**
 * Preloader — loads heavy assets + prefetches API data during splash screen
 * The splash shows for ~3s (brand moment). Use EVERY millisecond of that
 * to warm caches so the app is instant when content appears.
 *
 * v3: Progress signal (0→1) for login screen progress bar.
 * Stores parsed JSON, not Response objects (Response body can only be read once).
 */

let preloadStarted = false;
let resolveReady: () => void;
export const preloadReady = new Promise<void>(r => { resolveReady = r; });

// Progress tracking — login screen reads this to show loading bar
let _progress = 0;
let _totalSteps = 5; // chunk + curator + vee + channels + verified
let _completedSteps = 0;
const _listeners: Array<(p: number) => void> = [];

function stepDone() {
  _completedSteps++;
  _progress = Math.min(_completedSteps / _totalSteps, 1);
  for (const fn of _listeners) fn(_progress);
}

/** Current preload progress 0→1 */
export function getPreloadProgress(): number { return _progress; }

/** Subscribe to progress updates. Returns unsubscribe function. */
export function onPreloadProgress(fn: (p: number) => void): () => void {
  _listeners.push(fn);
  fn(_progress); // emit current immediately
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}

// Parsed JSON data — consumed once, then cleared
let _prefetchedCurator: unknown | null = null;
let _prefetchedVee: unknown | null = null;

/** Consume prefetched curator data (returns null if not available or already consumed) */
export function consumePrefetchedCurator(): unknown | null {
  const data = _prefetchedCurator;
  _prefetchedCurator = null;
  return data;
}

/** Consume prefetched VEE data (returns null if not available or already consumed) */
export function consumePrefetchedVee(): unknown | null {
  const data = _prefetchedVee;
  _prefetchedVee = null;
  return data;
}

/** Check if prefetch data is available (for preloadApiData fallback) */
export function hasPrefetchedCurator(): boolean { return _prefetchedCurator !== null; }
export function hasPrefetchedVee(): boolean { return _prefetchedVee !== null; }

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();

export function startPreload() {
  if (preloadStarted) return;
  preloadStarted = true;

  const loads: Promise<unknown>[] = [];

  // 1. Import HomePage chunk (~200ms) + prefetch ExperienceHomePage for fast navigation
  loads.push(
    import('@/pages/HomePage').catch(() => {}).finally(stepDone),
  );
  // Non-blocking: prefetch secondary page chunks so route transitions feel instant
  const prefetchPages = () => {
    import('@/pages/ExperienceHomePage').catch(() => {});
    import('@/pages/LiveTVPage').catch(() => {});
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(prefetchPages, { timeout: 4000 });
  } else {
    setTimeout(prefetchPages, 2000);
  }

  // 2. Prefetch + parse curator + VEE data DURING splash/login
  loads.push(
    fetch(`${PROXY}/curator.json`, { signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) _prefetchedCurator = data; })
      .catch(() => {})
      .finally(stepDone),
  );
  loads.push(
    fetch(`${PROXY}/vee.json`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) _prefetchedVee = data; })
      .catch(() => {})
      .finally(stepDone),
  );

  // 3. Warm HTTP cache for health + probe data (non-critical)
  loads.push(
    fetch(`${PROXY}/channels.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {}).finally(stepDone),
  );
  loads.push(
    fetch(`${PROXY}/verified.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {}).finally(stepDone),
  );

  // Signal ready when chunk + data are loaded (or timeout)
  Promise.allSettled(loads).then(() => resolveReady());
  setTimeout(resolveReady, 6000);
}

/**
 * Preload after auth — only fires if splash prefetch missed
 */
export function preloadApiData(proxyUrl: string, _username: string, _password: string) {
  if (!hasPrefetchedCurator()) {
    fetch(`${proxyUrl}/curator.json`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  }
  if (!hasPrefetchedVee()) {
    fetch(`${proxyUrl}/vee.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
