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

// ── Logo-warm progress (0→1) — the splash holds until this reaches 1 (or the
//    budget elapses), so on first open EVERY channel logo is cached on-device
//    forever before the interface is revealed. ──────────────────────────────
let _logoProgress = 0;
const _logoListeners: Array<(p: number) => void> = [];
/** Current logo-warm progress 0→1 (1 = every logo cached, or budget reached). */
export function getLogoProgress(): number { return _logoProgress; }
export function onLogoProgress(fn: (p: number) => void): () => void {
  _logoListeners.push(fn);
  fn(_logoProgress);
  return () => { const i = _logoListeners.indexOf(fn); if (i >= 0) _logoListeners.splice(i, 1); };
}
function setLogoProgress(p: number) {
  _logoProgress = p;
  for (const fn of _logoListeners) fn(p);
}

// Parsed JSON data — consumed once, then cleared
let _prefetchedCurator: unknown | null = null;
let _prefetchedVee: unknown | null = null;
let _prefetchedChannels: unknown | null = null;
let _prefetchedVerified: unknown | null = null;

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

/** Consume prefetched channels (VPS health) data */
export function consumePrefetchedChannels(): unknown | null {
  const data = _prefetchedChannels;
  _prefetchedChannels = null;
  return data;
}

/** Consume prefetched verified data */
export function consumePrefetchedVerified(): unknown | null {
  const data = _prefetchedVerified;
  _prefetchedVerified = null;
  return data;
}

/** Check if prefetch data is available (for preloadApiData fallback) */
export function hasPrefetchedCurator(): boolean { return _prefetchedCurator !== null; }
export function hasPrefetchedVee(): boolean { return _prefetchedVee !== null; }

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();
// curator.json, vee.json, verified.json live in Vercel public/ — served at origin, not by VPS proxy
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

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

  // 2. STATIC CATALOG: warm /tivi-curated.json during splash/login. No more
  //    curator/vee/channels/verified network fetches — "we control".
  loads.push(
    fetch(`${ORIGIN}/tivi-curated.json`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() : null)
      .then(() => {})
      .catch(() => {})
      .finally(stepDone),
  );
  // Remaining steps are inert now (kept so the progress bar still completes).
  stepDone(); // (was vee)
  stepDone(); // (was channels)
  stepDone(); // (was verified)

  // 3. FULL LOGO WARM — fetch + durably cache EVERY channel logo into the SW's
  //    logo cache, so from the first session all ~600 logos are on-device
  //    forever (never re-requested). Runs in the BACKGROUND to completion (full
  //    budget); lazy-imported so it costs the main bundle nothing.
  //
  //    The splash HOLDS for it only up to LOGO_HOLD_MS: on a good network the
  //    logos finish in a couple seconds → the interface is revealed fully
  //    preloaded; on a weak West-Africa network (where the real pain is
  //    bandwidth) the app still reveals promptly and the rest keep warming in
  //    the background. Correctness ("load a logo at most once, ever") does NOT
  //    depend on this hold — the SW's durable logo cache stores each logo on its
  //    first sight regardless; this just front-loads it.
  const LOGO_BG_BUDGET_MS = 12000; // full background warm
  import('@/lib/logoPreload')
    .then(({ preloadAllLogos }) =>
      preloadAllLogos((done, total) => {
        setLogoProgress(total ? done / total : 1);
      }, LOGO_BG_BUDGET_MS),
    )
    .catch(() => {})
    .finally(() => setLogoProgress(1));

  // BOOT NOTE: the splash reveal is NO LONGER held for the 600-logo warm. Warming
  // every logo before reveal was adding ~1.5s of dead splash on first open while
  // the 600 logo fetches also saturated bandwidth and slowed the critical path
  // (catalog + first content images). It's non-critical to reveal: each logo still
  // lazy-loads with its one-time fade and the SW durably caches it on first sight,
  // so the warm just front-loads that — it now finishes in the BACKGROUND after
  // the interface is already interactive. Reveal gates on chunk + catalog only.
  // Signal ready when the HomePage chunk + catalog are done.
  Promise.allSettled(loads).then(() => resolveReady());
  setTimeout(resolveReady, 5000); // absolute ceiling so a dead network can't trap the splash
}

/**
 * Preload after auth — only fires if splash prefetch missed
 */
export function preloadApiData(_proxyUrl: string, _username: string, _password: string) {
  // STATIC CATALOG: nothing to warm post-auth — channels come from the static
  // /tivi-curated.json already loaded during splash. No runtime panel fetches.
}
