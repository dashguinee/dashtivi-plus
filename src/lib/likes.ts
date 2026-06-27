/**
 * Likes store — localStorage `tivi_likes`, source of truth for the Library "Likes"
 * section. Reactive via useSyncExternalStore so a heart toggle anywhere updates every
 * subscriber (PosterCard, ContentDetailModal, LibraryPage) instantly.
 *
 * No DB block: localStorage is authoritative. The app has a Supabase client but no
 * likes table, so we don't mirror (per spec — never block on DB).
 */
import { useSyncExternalStore } from 'react';
import { getItem, setItem } from '@/lib/storage';

const KEY = 'likes'; // → localStorage key `tivi_likes` (storage.ts adds the `tivi_` prefix)

export interface LikeEntry {
  /** Stable id, e.g. `movie-123` / `series-456` */
  id: string;
  title: string;
  poster?: string;
  type: 'movie' | 'series';
  categoryId?: string;
  ts: number;
}

let cache: LikeEntry[] = getItem<LikeEntry[]>(KEY, []);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function write(next: LikeEntry[]) {
  cache = next;
  setItem(KEY, next);
  emit();
}

export function listLikes(): LikeEntry[] {
  return cache;
}

export function isLiked(id: string): boolean {
  return cache.some((e) => e.id === id);
}

export function addLike(entry: Omit<LikeEntry, 'ts'>): void {
  if (cache.some((e) => e.id === entry.id)) return;
  write([{ ...entry, ts: Date.now() }, ...cache]);
}

export function removeLike(id: string): void {
  if (!cache.some((e) => e.id === id)) return;
  write(cache.filter((e) => e.id !== id));
}

/** Toggle — returns the new liked state (true = now liked). */
export function toggleLike(entry: Omit<LikeEntry, 'ts'>): boolean {
  if (isLiked(entry.id)) {
    removeLike(entry.id);
    return false;
  }
  addLike(entry);
  return true;
}

// Cross-tab sync (same-tab updates go through emit() directly).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'tivi_likes') {
      cache = getItem<LikeEntry[]>(KEY, []);
      emit();
    }
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Reactive list of all likes (newest first). */
export function useLikes(): LikeEntry[] {
  return useSyncExternalStore(subscribe, listLikes, listLikes);
}

/** Reactive boolean for a single id — for heart toggles. */
export function useIsLiked(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isLiked(id),
    () => false,
  );
}
