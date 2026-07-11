/**
 * useWallShelves — the endless binder loader for "Le Mur".
 *
 * Each shelf spans several Xtream category IDs. Rather than pulling all 60k+
 * covers up front (v1 capped at 500 and stopped), this walks each shelf's
 * categories page-by-page (getVodByCategory(cat, PAGE, offset)) and APPENDS,
 * deduped, so the ←→ flip can run off the end of the loaded tail forever.
 *
 * The wall calls loadMore(shelfIdx) whenever the cursor nears the loaded tail;
 * the hook fetches the next page (advancing to the next category when one is
 * exhausted) and grows that shelf's pool. Robust by design: failed fetches fall
 * back to empty, an exhausted shelf goes inert, in-flight guards stop overlap.
 */
import { useCallback, useRef, useState } from 'react';
import type { VodStream } from '@/lib/xtream';
import { getVodByCategory, vodDbToStream } from '@/lib/xtream';
import type { WallShelf } from '@/lib/wall-shelves';

const PAGE = 500;

interface ShelfLoader {
  catIndex: number;   // which categoryId we're currently paging
  offset: number;     // offset within that category
  seen: Set<number>;  // dedupe across categories + pages
  inFlight: boolean;
  exhausted: boolean; // every category walked to its end
}

export interface WallShelvesState {
  /** Per-shelf cover pools, index-aligned with the shelves array. */
  pools: VodStream[][];
  /** Per-shelf "no more pages" flag. */
  exhausted: boolean[];
  /** Fetch + append the next page for one shelf. Safe to spam (guarded). */
  loadMore: (shelfIdx: number) => void;
}

export function useWallShelves(shelves: WallShelf[]): WallShelvesState {
  const [pools, setPools] = useState<VodStream[][]>(() => shelves.map(() => []));
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
      const appended: VodStream[] = [];
      // Keep pulling pages until we surface at least one fresh cover (or run dry),
      // so a page full of dupes/short tail doesn't stall the flip.
      while (appended.length === 0 && !L.exhausted) {
        if (L.catIndex >= shelf.categoryIds.length) { L.exhausted = true; break; }
        const cat = shelf.categoryIds[L.catIndex];
        const rows = await getVodByCategory(cat, PAGE, L.offset).catch(() => []);
        // Short page → this category is spent, move to the next one next time.
        if (rows.length < PAGE) { L.catIndex += 1; L.offset = 0; }
        else { L.offset += PAGE; }
        for (const r of rows) {
          if (L.seen.has(r.id)) continue;
          L.seen.add(r.id);
          appended.push(vodDbToStream(r));
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
