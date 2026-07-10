import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import { getVodByCategory, vodDbToStream, getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { Channel } from '@/types';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';
import { MoviesTrailerSpace } from '@/components/home/MoviesTrailerSpace';
import { WallShelf } from '@/components/wall/WallShelf';
import { SHELVES } from '@/lib/wall-shelves';

/* ════════════════════════════════════════════════════════════════════
   LE MUR — the cinema cover-wall (v1, read-only preview at /wall).

   Three hard-coded shelves (New Drops · Hollywood · Netflix) stacked
   vertically. Native vertical scroll moves BETWEEN shelves; a horizontal
   swipe (useSwipeSurf) FLIPS the covers of the ACTIVE shelf left/right,
   with a live rubber-band peek. Tapping a cover opens the existing
   MoviesTrailerSpace detail overlay.

   Additive + opt-in: this is a separate route beside the classic MoviesPage;
   it never edits it. data-space="movies" lets the App-level cinema bloom fire.
   ════════════════════════════════════════════════════════════════════ */

const CARD_WIDTH = 120;

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

export const CinemaWallPage: React.FC<Props> = ({ credentials, onPlay }) => {
  // Per-shelf item pools (index-aligned with SHELVES).
  const [shelfItems, setShelfItems] = useState<VodStream[][]>(() => SHELVES.map(() => []));
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [shelfIdx, setShelfIdx] = useState(0);
  const [cursors, setCursors] = useState<number[]>(() => SHELVES.map(() => 0));
  const [dragDx, setDragDx] = useState(0);
  const [detail, setDetail] = useState<VodStream | null>(null);

  // Suppress the stray click a horizontal swipe fires after it lifts, so a flip
  // never also opens a cover's detail.
  const swipedAtRef = useRef(0);

  // ── Load TMDB map once (poster + rating enrichment). ──
  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

  // ── Load the three shelves (dedupe per shelf, like MoviesPage). ──
  useEffect(() => {
    let mounted = true;
    Promise.all(
      SHELVES.map(shelf =>
        Promise.all(shelf.categoryIds.map(id => getVodByCategory(id).catch(() => [])))
          .then(lists => {
            const seen = new Set<number>();
            const out: VodStream[] = [];
            for (const rows of lists) for (const r of rows) {
              if (seen.has(r.id)) continue;
              seen.add(r.id);
              out.push(vodDbToStream(r));
            }
            return out;
          })
          .catch(() => [] as VodStream[])
      )
    ).then(pools => { if (mounted) setShelfItems(pools); });
    return () => { mounted = false; };
  }, []);

  // ── Flip the active shelf's cursor within bounds. ──
  const flip = useCallback((dir: 1 | -1) => {
    swipedAtRef.current = Date.now();
    setCursors(prev => {
      const next = [...prev];
      const max = Math.max(0, (shelfItems[shelfIdx]?.length ?? 1) - 1);
      next[shelfIdx] = Math.min(Math.max(0, next[shelfIdx] + dir), max);
      return next;
    });
  }, [shelfIdx, shelfItems]);

  const surf = useSwipeSurf({
    onNext: () => flip(1),   // swipe-left → next cover
    onPrev: () => flip(-1),  // swipe-right → previous cover
    onDrag: (dx) => {
      if (Math.abs(dx) > 8) swipedAtRef.current = Date.now();
      setDragDx(dx);
    },
  });

  // ── Open detail on a genuine tap (not the tail of a swipe). ──
  const handleOpen = useCallback((movie: VodStream) => {
    if (Date.now() - swipedAtRef.current < 250) return;
    setDetail(movie);
  }, []);

  const activePool = shelfItems[shelfIdx] ?? [];

  return (
    <div
      data-space="movies"
      className="min-h-screen pb-32"
      style={{ paddingTop: 'max(4.5rem, calc(4rem + env(safe-area-inset-top, 0px)))' }}
      {...surf}
    >
      {/* Ambient candle-warm wash — matches the Movies space depth. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          background:
            'radial-gradient(115% 70% at 50% -8%, rgba(232,176,75,0.055), transparent 60%),' +
            'radial-gradient(85% 60% at 92% 88%, rgba(157,78,221,0.04), transparent 60%)',
        }}
      />

      <div className="px-5 pb-4">
        <h1
          className="text-[24px] font-black text-white tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
        >
          Le Mur
        </h1>
        <p className="text-[12px] text-white/40 mt-0.5">Swipe pour feuilleter · tape pour ouvrir</p>
      </div>

      <div className="flex flex-col gap-9 section-glow">
        {SHELVES.map((shelf, i) => (
          <WallShelf
            key={shelf.id}
            items={shelfItems[i] ?? []}
            cursor={cursors[i] ?? 0}
            tmdbMap={tmdbMap}
            accent={shelf.accent}
            label={shelf.label}
            active={i === shelfIdx}
            cardWidth={CARD_WIDTH}
            dragDx={i === shelfIdx ? dragDx : 0}
            onOpen={handleOpen}
            onActivate={() => setShelfIdx(i)}
          />
        ))}
      </div>

      {/* Detail overlay — the existing 4-direction trailer space, verbatim. */}
      {detail && (
        <MoviesTrailerSpace
          credentials={credentials}
          initial={detail}
          pool={activePool.length > 0 ? activePool : shelfItems[0] ?? []}
          tmdbMap={tmdbMap}
          onPlay={onPlay}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
};
