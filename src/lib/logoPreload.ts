/**
 * logoPreload — front-load EVERY channel logo into the SW's durable logo cache
 * while the splash is showing, so from the very first session every one of the
 * ~600 logos is on-device forever (requested at most once, ever). Loaded lazily
 * (dynamic import) so none of this touches the main bundle.
 *
 * Mechanism: load each logo via `new Image()`. The Service Worker intercepts the
 * request and stores it in the durable `tivi-logos-stable-1` cache (cache-first,
 * opaque responses included), so the bytes land on-device whether or not the
 * <img> is ever shown. Concurrency-limited so a weak West-Africa network isn't
 * flooded, progress-reported for the splash, and bounded by a time budget so it
 * can NEVER hang the splash — if the budget elapses the rest keep warming in the
 * background and the SW still caches each on first real sight.
 */

import { getCatalog } from './catalog';
import { safeImageUrl } from './xtream';
import { markPainted } from './imageLoading';

let started = false;

export async function preloadAllLogos(
  onProgress?: (done: number, total: number) => void,
  budgetMs = 12000,
): Promise<void> {
  if (started) return;
  started = true;

  // Wait (briefly) for the SW to control the page so these loads are actually
  // stored durably; on a brand-new install the very first loads might bypass it,
  // which is fine — the SW then caches each logo on its first real display.
  try {
    if (navigator.serviceWorker) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<void>((r) => setTimeout(r, 2000)),
      ]);
    }
  } catch { /* no SW — warming still primes the HTTP cache */ }

  let cat;
  try { cat = await getCatalog(); } catch { onProgress?.(0, 0); return; }

  const urls = Array.from(
    new Set(
      cat.channels
        .map((c) => safeImageUrl(c.icon))
        .filter((u): u is string => !!u),
    ),
  );
  const total = urls.length;
  if (total === 0) { onProgress?.(0, 0); return; }

  let done = 0;
  let i = 0;
  const CONCURRENCY = 6;

  const warmOne = (url: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      const finish = (ok: boolean) => {
        done++;
        if (ok) markPainted(url); // seed in-memory paint-state → no fade later
        onProgress?.(done, total);
        resolve();
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
    });

  const worker = async () => {
    while (i < urls.length) {
      await warmOne(urls[i++]);
    }
  };

  const all = Promise.all(
    Array.from({ length: CONCURRENCY }, worker),
  ).then(() => {});

  // Resolve when everything settles OR the budget elapses — whichever is first.
  await Promise.race([all, new Promise<void>((r) => setTimeout(r, budgetMs))]);
}
