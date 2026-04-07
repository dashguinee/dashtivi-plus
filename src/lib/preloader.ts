/**
 * Preloader — loads heavy assets + prefetches API data during splash screen
 * The splash shows for 2.5-3s (brand moment). Use EVERY millisecond of that
 * to warm caches so the app is instant when content appears.
 *
 * v2: Stores parsed JSON, not Response objects (Response body can only be read once).
 */

let preloadStarted = false;
let resolveReady: () => void;
export const preloadReady = new Promise<void>(r => { resolveReady = r; });

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

  // 1. Import HomePage chunk (~200ms)
  loads.push(
    import('@/pages/HomePage').catch(() => {}),
  );

  // 2. Prefetch + parse curator + VEE data DURING splash
  loads.push(
    fetch(`${PROXY}/curator.json`, { signal: AbortSignal.timeout(8000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) _prefetchedCurator = data; })
      .catch(() => {}),
  );
  loads.push(
    fetch(`${PROXY}/vee.json`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) _prefetchedVee = data; })
      .catch(() => {}),
  );

  // 3. Warm HTTP cache for health + probe data (non-critical)
  loads.push(
    fetch(`${PROXY}/channels.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {}),
  );
  loads.push(
    fetch(`${PROXY}/verified.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {}),
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
