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
