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

  // Only preload what the homepage needs for first paint
  // Everything else loads lazily when the user navigates
  loads.push(
    import('@/pages/HomePage').catch(() => {}),
  );

  // Signal ready quickly — don't block splash on data fetches
  Promise.allSettled(loads).then(() => resolveReady());

  // Failsafe — resolve after 6s no matter what
  setTimeout(resolveReady, 6000);
}

/**
 * Preload after auth — warm up the API cache with credentials
 */
export function preloadApiData(proxyUrl: string, _username: string, _password: string) {
  // Warm the curator + VEE cache (these are what the homepage actually uses)
  fetch(`${proxyUrl}/curator.json`, { signal: AbortSignal.timeout(8000) }).catch(() => {});
  fetch(`${proxyUrl}/vee.json`, { signal: AbortSignal.timeout(5000) }).catch(() => {});
}
