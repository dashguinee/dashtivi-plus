import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { XtreamCredentials, VodStream, SeriesItem } from '@/lib/xtream';
import { getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { Channel } from '@/types';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';
import { useWallShelves } from '@/hooks/useWallShelves';
import { MoviesTrailerSpace } from '@/components/home/MoviesTrailerSpace';
import { SeriesDetailFlow } from '@/components/wall/SeriesDetailFlow';
import { WallShelf } from '@/components/wall/WallShelf';
import { SHELVES, CATALOG_TOTAL } from '@/lib/wall-shelves';
import type { WallItem } from '@/lib/wall-shelves';

/* ════════════════════════════════════════════════════════════════════
   LE MUR — the cinema cover-wall (v2, /wall).

   The African DVD-shop binder, digitised: the whole catalogue is ONE living
   wall of covers you FLIP through, cover-first, four-directional.

   • ←→  flips the ACTIVE shelf by a full PAGE of covers (a binder page), and
     lazy-loads the next page as the cursor nears the tail — endless flip through
     tens of thousands, only ~cursor±16 covers ever mounted (WallShelf windowing).
   • ↑↓  moves between shelves with a deliberate snap. The active shelf is
     full-bright + full-size; neighbours dim and shrink — the vendor's-eye depth.
   • Gestures (useSwipeSurf 4-dir) + mouse-wheel + arrow keys all drive it.
   • Tapping a cover opens the existing MoviesTrailerSpace detail overlay.

   Additive + opt-in: a separate route beside the classic MoviesPage; it never
   edits it. data-space="movies" lets the App-level cinema bloom fire.
   ════════════════════════════════════════════════════════════════════ */

const CARD_WIDTH = 112;
const CARD_STRIDE = CARD_WIDTH + 14; // must match WallShelf CARD_GAP
// Fixed vertical slot per shelf so the stack snaps cleanly between strips.
const SHELF_SLOT = 300;
// Minimum covers advanced per flip — a brisk "binder page" even on narrow phones.
const MIN_PAGE = 4;

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
}

/** French thousands: 62000 → "62 000". */
function frCount(n: number): string {
  return n.toLocaleString('fr-FR');
}

export const CinemaWallPage: React.FC<Props> = ({ credentials, onPlay }) => {
  const { pools, exhausted, loadMore } = useWallShelves(SHELVES);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [shelfIdx, setShelfIdx] = useState(0);
  const [cursors, setCursors] = useState<number[]>(() => SHELVES.map(() => 0));
  const [dragDx, setDragDx] = useState(0);
  const [detail, setDetail] = useState<WallItem | null>(null);

  // Covers visible in one screen → the size of a "binder page" flip.
  const [perPage, setPerPage] = useState(MIN_PAGE);

  // Suppress the stray click a horizontal swipe fires after it lifts, so a flip
  // never also opens a cover's detail.
  const swipedAtRef = useRef(0);
  // Wheel debounce so a single trackpad scroll doesn't skip several shelves.
  const wheelAtRef = useRef(0);

  // ── Load TMDB map once (poster + rating enrichment). ──
  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

  // ── Prime every shelf's first page (counts + neighbour previews). ──
  useEffect(() => {
    SHELVES.forEach((_, i) => loadMore(i));
  }, [loadMore]);

  // ── Recompute the binder-page size from the viewport width. ──
  useEffect(() => {
    const recompute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 390;
      const visible = Math.floor((w - 40) / CARD_STRIDE);
      setPerPage(Math.max(MIN_PAGE, visible));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  // ── Flip the active shelf by one binder page, within bounds. ──
  const flip = useCallback((dir: 1 | -1) => {
    swipedAtRef.current = Date.now();
    setCursors(prev => {
      const next = [...prev];
      const max = Math.max(0, (pools[shelfIdx]?.length ?? 1) - 1);
      next[shelfIdx] = Math.min(Math.max(0, next[shelfIdx] + dir * perPage), max);
      return next;
    });
  }, [shelfIdx, pools, perPage]);

  // ── Move between shelves with a snap. ──
  const changeShelf = useCallback((dir: 1 | -1) => {
    setShelfIdx(prev => Math.min(Math.max(0, prev + dir), SHELVES.length - 1));
    setDragDx(0);
  }, []);

  const surf = useSwipeSurf({
    onNext: () => flip(1),        // swipe-left → next page
    onPrev: () => flip(-1),       // swipe-right → previous page
    onUp: () => changeShelf(-1),  // swipe-down → previous shelf
    onDown: () => changeShelf(1), // swipe-up → next shelf
    onDrag: (dx) => {
      // Only a substantial drag counts as a "swipe" that should suppress the
      // trailing click — a touch-tap jitters a few px and MUST still open the
      // cover (else play/trailer are unreachable).
      if (Math.abs(dx) > 30) swipedAtRef.current = Date.now();
      setDragDx(dx);
    },
  });

  // ── Lazy-load ahead: keep a deep buffer of covers past the cursor so flipping
  // ALWAYS reveals more — never a dead end. Re-fires as the pool grows (pools in
  // deps) until the buffer is deep or the shelf is exhausted. ──
  useEffect(() => {
    const pool = pools[shelfIdx] ?? [];
    const cur = cursors[shelfIdx] ?? 0;
    if (!exhausted[shelfIdx] && pool.length - cur < perPage * 6) loadMore(shelfIdx);
  }, [cursors, shelfIdx, pools, perPage, exhausted, loadMore]);

  // ── Keyboard: arrows flip / change shelf (desktop parity with gestures). ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detail) return; // detail overlay owns keys when open
      if (e.key === 'ArrowLeft') { flip(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { flip(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { changeShelf(-1); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { changeShelf(1); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, changeShelf, detail]);

  // ── Mouse-wheel / trackpad: vertical scroll = shelf snap, horizontal = flip. ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (detail) return;
    const now = Date.now();
    if (now - wheelAtRef.current < 320) return;
    const { deltaX, deltaY } = e;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) < 12) return;
      wheelAtRef.current = now;
      flip(deltaX > 0 ? 1 : -1);
    } else {
      if (Math.abs(deltaY) < 12) return;
      wheelAtRef.current = now;
      changeShelf(deltaY > 0 ? 1 : -1);
    }
  }, [flip, changeShelf, detail]);

  // ── Open detail on a genuine tap (not the tail of a swipe). ──
  const handleOpen = useCallback((item: WallItem) => {
    if (Date.now() - swipedAtRef.current < 250) return;
    setDetail(item);
  }, []);

  const activePool = pools[shelfIdx] ?? [];
  // Movie pool for the trailer-space spatial model — flatten the loaded movie
  // strips so a movie detail can browse laterally even from a short shelf.
  const moviePool: VodStream[] = (activePool.length ? activePool : pools[0] ?? [])
    .filter(x => x.kind === 'movie')
    .map(x => x.raw as VodStream);

  return (
    <div
      data-space="movies"
      className="min-h-screen overflow-hidden pb-32"
      style={{ paddingTop: 'max(4.5rem, calc(4rem + env(safe-area-inset-top, 0px)))' }}
      onWheel={onWheel}
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

      <div className="px-5 pb-5">
        <h1
          className="text-[24px] font-black text-white tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
        >
          Cinéma
        </h1>
        {/* Vendor's line — the whole shop's scale. */}
        <p className="text-[12px] text-white/45 mt-0.5">
          <span className="text-white/70 font-semibold">{frCount(CATALOG_TOTAL)} films &amp; séries</span>
          {' · flip librement · '}
          <span className="text-white/35">swipe pour feuilleter, tape pour ouvrir</span>
        </p>
      </div>

      {/* Vertical shelf-stack — translateY snaps the active strip into place; the
          neighbours peek above/below, dimmed + shrunk (the vendor's eye depth). */}
      <div
        className="section-glow"
        style={{
          transform: `translateY(${-shelfIdx * SHELF_SLOT}px)`,
          transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform',
        }}
      >
        {SHELVES.map((shelf, i) => (
          <div
            key={shelf.id}
            style={{
              height: SHELF_SLOT,
              opacity: i === shelfIdx ? 1 : 0.5,
              transform: i === shelfIdx ? 'scale(1)' : 'scale(0.9)',
              transformOrigin: 'left center',
              transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <WallShelf
              items={pools[i] ?? []}
              cursor={cursors[i] ?? 0}
              tmdbMap={tmdbMap}
              accent={shelf.accent}
              label={shelf.label}
              noun={shelf.kind === 'series' ? 'séries' : 'films'}
              hot={shelf.hot}
              exhausted={exhausted[i] ?? false}
              active={i === shelfIdx}
              cardWidth={CARD_WIDTH}
              dragDx={i === shelfIdx ? dragDx : 0}
              onOpen={handleOpen}
              onActivate={() => setShelfIdx(i)}
            />
          </div>
        ))}
      </div>

      {/* Detail overlay — movies open the 4-direction trailer space; series open
          the full detail → episode-picker → play flow. */}
      {detail && detail.kind === 'movie' && (
        <MoviesTrailerSpace
          credentials={credentials}
          initial={detail.raw as VodStream}
          pool={moviePool.length > 0 ? moviePool : [detail.raw as VodStream]}
          tmdbMap={tmdbMap}
          onPlay={onPlay}
          onClose={() => setDetail(null)}
        />
      )}
      {detail && detail.kind === 'series' && (
        <SeriesDetailFlow
          series={detail.raw as SeriesItem}
          credentials={credentials}
          tmdbData={tmdbMap[`s:${detail.id}`]}
          onPlay={onPlay}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
};
