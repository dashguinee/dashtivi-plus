/**
 * Downloads store — localStorage `tivi_downloads`. Every download triggered in the app
 * (player overlay, Movies grid, Series episodes) is recorded here so it surfaces in the
 * Library "My Downloads" section. localStorage is the source of truth; no DB mirror
 * (no downloads table exists — per spec, never block on DB).
 */
import { useSyncExternalStore } from 'react';
import { getItem, setItem } from '@/lib/storage';

const KEY = 'downloads'; // → localStorage key `tivi_downloads`
const MAX = 100;

export interface DownloadEntry {
  title: string;
  poster?: string;
  url: string;
  type: 'movie' | 'series' | 'episode';
  ts: number;
}

let cache: DownloadEntry[] = getItem<DownloadEntry[]>(KEY, []);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(next: DownloadEntry[]) {
  cache = next;
  setItem(KEY, next);
  emit();
}

export function listDownloads(): DownloadEntry[] {
  return cache;
}

/** Record a download (dedup by url, newest first). Safe to call on every download. */
export function recordDownload(entry: Omit<DownloadEntry, 'ts'>): void {
  if (!entry.url) return;
  const filtered = cache.filter((d) => d.url !== entry.url);
  write([{ ...entry, ts: Date.now() }, ...filtered].slice(0, MAX));
}

// ── Unified download trigger ────────────────────────────────────────────────
// Why this exists: every VOD/episode URL is served by the PROXY origin
// (stream.zionsynapse.online), which is cross-origin from the app. Browsers
// IGNORE the <a download> attribute cross-origin, so the old anchor just NAVIGATED
// (opened a tab) instead of saving. The reliable fix is server-driven: we tag the
// proxy URL with `dl=1` and the desired filename, and the proxy answers with
//   Content-Disposition: attachment; filename="<name>.<ext>"
// which forces a SAVE in every browser, cross-origin or not. All 4 call sites
// (player, Movies, Series, Platforms) route through here so they behave identically.

const DL_PARAM = 'dl';        // proxy: dl=1 → respond as attachment
const DL_NAME_PARAM = 'dlname'; // proxy: dlname=<urlencoded filename> → Content-Disposition filename

/** Sanitize a human title into a safe filesystem base name (no extension). */
function sanitizeBaseName(name: string, max = 120): string {
  const clean = (name || 'video')
    .replace(/[^a-zA-Z0-9\s\-_.()]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, max);
  return clean || 'video';
}

/**
 * Parse the REAL media extension from a proxy VOD/series URL. Fixes the old bug
 * where `/vod?…&ext=mkv` has no dot, so a `\.(\w+)` regex found nothing and
 * mislabeled remux downloads as `.mp4`. Checks, in order:
 *   1. remux shape   → `…&ext=mkv`
 *   2. direct shape  → `?url=<encoded …/12345.mkv>`
 *   3. plain dotted url
 *   4. default `mp4`
 */
export function extFromVodUrl(url: string): string {
  if (!url) return 'mp4';
  const extParam = url.match(/[?&]ext=([a-z0-9]{2,5})/i);
  if (extParam) return extParam[1].toLowerCase();
  try {
    const decoded = decodeURIComponent(url);
    const m = decoded.match(/\.([a-z0-9]{2,5})(?:[?&#].*)?$/i);
    if (m) return m[1].toLowerCase();
  } catch { /* malformed %-encoding — fall through */ }
  const dotted = url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  if (dotted) return dotted[1].toLowerCase();
  return 'mp4';
}

export interface DownloadRequest {
  /** Built proxy URL of the media (either `…/vod?…` or `…?url=…` shape). */
  url: string;
  /** Human base name WITHOUT extension (sanitized + given the real ext internally). */
  baseName: string;
  /** Title shown in the Library "My Downloads" list. */
  title: string;
  poster?: string;
  type: DownloadEntry['type'];
}

/**
 * Trigger a SAVE (never a tab) for a proxied VOD/episode and record it. The proxy's
 * Content-Disposition (driven by `dl=1`) forces the download even cross-origin; the
 * `download` attribute is kept as a same-origin hint. Returns the filename used.
 */
export function triggerDownload(req: DownloadRequest): string | null {
  if (!req.url) return null;
  const ext = extFromVodUrl(req.url);
  const filename = `${sanitizeBaseName(req.baseName)}.${ext}`;
  // Both proxy shapes are query-string based, so append with the right separator.
  const sep = req.url.includes('?') ? '&' : '?';
  const dlUrl = `${req.url}${sep}${DL_PARAM}=1&${DL_NAME_PARAM}=${encodeURIComponent(filename)}`;

  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = filename;       // same-origin hint; cross-origin save is forced by Content-Disposition
  a.rel = 'noopener noreferrer';
  // No target=_blank — the attachment header downloads in place; a blank target
  // would risk a stray tab if a browser/proxy ever failed to send the header.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Record the ORIGINAL url (not the dl-tagged one) so Library dedup stays stable.
  recordDownload({ title: req.title, poster: req.poster, url: req.url, type: req.type });
  return filename;
}

export function removeDownload(url: string): void {
  if (!cache.some((d) => d.url === url)) return;
  write(cache.filter((d) => d.url !== url));
}

export function clearDownloads(): void {
  write([]);
}

// Cross-tab sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'tivi_downloads') {
      cache = getItem<DownloadEntry[]>(KEY, []);
      emit();
    }
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDownloads(): DownloadEntry[] {
  return useSyncExternalStore(subscribe, listDownloads, listDownloads);
}
