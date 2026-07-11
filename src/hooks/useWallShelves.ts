/**
 * useWallShelves — the endless binder loader for "Le Mur" (v3: movies + series).
 *
 * Each shelf spans several Xtream category IDs and is either a MOVIE strip or a
 * SERIES strip (shelf.kind). Rather than pulling tens of thousands of covers up
 * front, this walks each shelf's categories page-by-page and APPENDS, deduped, as
 * unified WallItems — so the ←→ flip can run off the end of the loaded tail.
 *
 * The wall calls loadMore(shelfIdx) whenever the cursor nears the loaded tail; the
 * hook fetches the next page (advancing to the next category when one is exhausted)
 * and grows that shelf's pool. Robust: failed fetches fall back to empty, an
 * exhausted shelf goes inert, in-flight guards stop overlap.
 */
import { useCallback, useRef, useState } from 'react';
import { getVodByCategory, vodDbToStream, getSeriesByCategory, seriesDbToItem } from '@/lib/xtream';
import type { WallShelf, WallItem } from '@/lib/wall-shelves';

const PAGE = 500;

interface ShelfLoader {
  catIndex: number;   // which categoryId we're currently paging
  offset: number;     // offset within that category
  seen: Set<number>;  // dedupe across categories + pages (by item id)
  inFlight: boolean;
  exhausted: boolean; // every category walked to its end
}

export interface WallShelvesState {
  /** Per-shelf cover pools, index-aligned with the shelves array. */
  pools: WallItem[][];
  /** Per-shelf "no more pages" flag. */
  exhausted: boolean[];
  /** Fetch + append the next page for one shelf. Safe to spam (guarded). */
  loadMore: (shelfIdx: number) => void;
}

/** One page of a shelf's covers as unified WallItems (movie or series). */
async function fetchPage(shelf: WallShelf, cat: string, offset: number): Promise<WallItem[]> {
  if (shelf.kind === 'series') {
    const rows = await getSeriesByCategory(cat, PAGE, offset).catch(() => []);
    return rows.map((r): WallItem => {
      const s = seriesDbToItem(r);
      return { kind: 'series', id: s.series_id, name: s.name, poster: s.cover, rating: s.rating, raw: s };
    });
  }
  const rows = await getVodByCategory(cat, PAGE, offset).catch(() => []);
  return rows.map((r): WallItem => {
    const m = vodDbToStream(r);
    return { kind: 'movie', id: m.stream_id, name: m.name, poster: m.stream_icon, rating: m.rating, raw: m };
  });
}

export function useWallShelves(shelves: WallShelf[]): WallShelvesState {
  const [pools, setPools] = useState<WallItem[][]>(() => shelves.map(() => []));
  const [exhausted, setExhausted] = useState<boolean[]>(() => shelves.map(() => false));

  const loaders = useRef<ShelfLoader[]>(
    shelves.map(() => ({ catIndex: 0, offset: 0, seen: new Set<number>(), inFlight: false, exhausted: false }))
  );

  const loadMore = useCallback((shelfIdx: number) => {
    const L = loaders.current[shelfIdx];
    const shelf = shelves[shelfIdx];
    if (!L || !shelf || L.inFlight || L.exhausted) return;
    L.inFlight = true;

    (async () => {
      const appended: WallItem[] = [];
      // Keep pulling pages until we surface at least one fresh cover (or run dry),
      // so a page full of dupes / short tail doesn't stall the flip.
      while (appended.length === 0 && !L.exhausted) {
        if (L.catIndex >= shelf.categoryIds.length) { L.exhausted = true; break; }
        const cat = shelf.categoryIds[L.catIndex];
        const page = await fetchPage(shelf, cat, L.offset);
        // Short page → this category is spent, move to the next one next time.
        if (page.length < PAGE) { L.catIndex += 1; L.offset = 0; }
        else { L.offset += PAGE; }
        for (const it of page) {
          if (L.seen.has(it.id)) continue;
          L.seen.add(it.id);
          appended.push(it);
        }
      }

      if (appended.length > 0) {
        setPools(prev => {
          const next = [...prev];
          next[shelfIdx] = [...(next[shelfIdx] ?? []), ...appended];
          return next;
        });
      }
      if (L.exhausted) {
        setExhausted(prev => {
          if (prev[shelfIdx]) return prev;
          const next = [...prev];
          next[shelfIdx] = true;
          return next;
        });
      }
      L.inFlight = false;
    })();
  }, [shelves]);

  return { pools, exhausted, loadMore };
}
