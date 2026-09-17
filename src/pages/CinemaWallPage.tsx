import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { XtreamCredentials, VodStream, SeriesItem } from '@/lib/xtream';
import { getTmdbMap, buildVodUrl, buildVodFallbackUrl, searchVod, searchSeries, vodDbToStream, seriesDbToItem } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { Channel } from '@/types';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';
import { useWallShelves } from '@/hooks/useWallShelves';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { SeriesDetailFlow } from '@/components/wall/SeriesDetailFlow';
import { WallShelf } from '@/components/wall/WallShelf';
import { SHELVES, CATALOG_TOTAL } from '@/lib/wall-shelves';
import type { WallItem, WallShelf as WallShelfDef } from '@/lib/wall-shelves';
import { buildRecMovieShelves } from '@/lib/wall-rec-shelves';

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
const SHELF_SLOT = 250;
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

const WallSurface: React.FC<Props & { shelves: WallShelfDef[] }> = ({ credentials, onPlay, shelves }) => {
  const { pools, exhausted, loadMore } = useWallShelves(shelves);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [shelfIdx, setShelfIdx] = useState(0);
  const [cursors, setCursors] = useState<number[]>(() => shelves.map(() => 0));
  const [dragDx, setDragDx] = useState(0);
  const [detail, setDetail] = useState<WallItem | null>(null);

  // Covers visible in one screen → the size of a "binder page" flip.
  const [perPage, setPerPage] = useState(MIN_PAGE);

  // Clamp the vertical shelf-scroll so the LAST shelves fill the screen instead of
  // one shelf isolating at the top with a blank void below it (Aziz 2026-09-17:
  // "keep scrolling down it just goes blank").
  const stackTopRef = useRef<HTMLDivElement>(null);
  const [maxScrollPx, setMaxScrollPx] = useState(0);

  // ── SEARCH — a contained overlay over the wall (its OWN scroll; touch-action
  //    auto; never touches the swipe-surf gestures). Reaches any of the 62k by
  //    name via searchVod + searchSeries; a tap opens the existing detail → play. ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WallItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const [vods, sers] = await Promise.all([
        searchVod(q, 30).catch(() => []),
        searchSeries(q, 18).catch(() => []),
      ]);
      if (seq !== searchSeq.current) return; // a newer query superseded this one
      const items: WallItem[] = [];
      for (const v of vods) { const vs = vodDbToStream(v); items.push({ kind: 'movie', id: vs.stream_id, name: vs.name, poster: vs.stream_icon || '', rating: String(v.rating ?? ''), raw: vs }); }
      for (const s of sers) { const si = seriesDbToItem(s); items.push({ kind: 'series', id: si.series_id, name: si.name, poster: si.cover || '', rating: si.rating || '', raw: si }); }
      setResults(items);
      setSearching(false);
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  // Suppress the stray click a horizontal swipe fires after it lifts, so a flip
  // never also opens a cover's detail.
  const swipedAtRef = useRef(0);
  // Wheel debounce so a single trackpad scroll doesn't skip several shelves.
  const wheelAtRef = useRef(0);

  // ── Load TMDB map once (poster + rating enrichment). ──
  useEffect(() => { getTmdbMap().then(m => m && setTmdbMap(m.TMDB_MAP)); }, []);

  // ── Prime every shelf's first page (counts + neighbour previews). ──
  useEffect(() => {
    shelves.forEach((_, i) => loadMore(i));
  }, [loadMore]);

  // ── Recompute the binder-page size from the viewport width. ──
  useEffect(() => {
    const recompute = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 390;
      const visible = Math.floor((w - 40) / CARD_STRIDE);
      setPerPage(Math.max(MIN_PAGE, visible));
      // Scroll clamp: total content height − the height available below the header
      // (down to the nav) → the last shelves fill the screen, never a blank tail.
      const top = stackTopRef.current?.getBoundingClientRect().top ?? 200;
      const availH = (typeof window !== 'undefined' ? window.innerHeight : 844) - top - 88;
      setMaxScrollPx(Math.max(0, shelves.length * SHELF_SLOT - Math.max(SHELF_SLOT, availH)));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [shelves.length]);

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
    setShelfIdx(prev => Math.min(Math.max(0, prev + dir), shelves.length - 1));
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
    if (!exhausted[shelfIdx] && pool.length - cur < perPage * 3) loadMore(shelfIdx);
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

  // ── Play a movie: build the VOD channel + hand it to the player. ──
  const playMovie = useCallback((m: VodStream) => {
    const ext = m.container_extension || 'mp4';
    onPlay({
      id: `vod-${m.stream_id}`,
      name: m.name,
      url: buildVodUrl(credentials, m.stream_id, ext),
      logo: m.stream_icon,
      category: 'movie',
      fallbackUrl: buildVodFallbackUrl(credentials, m.stream_id, ext, 'movie'),
    });
    setDetail(null);
  }, [credentials, onPlay]);

  return (
    <div
      data-space="movies"
      className="min-h-screen overflow-hidden pb-32"
      style={{
        paddingTop: 'max(4.5rem, calc(4rem + env(safe-area-inset-top, 0px)))',
        // touch-action:none → the browser can't hijack the touch for a native pan and cancel the pointer-event swipe (the wall has NO native scroll; all nav is useSwipeSurf flip/shelf gestures). 'auto' while a detail modal is open so it scrolls. Root fix for "can't navigate Cinema on mobile" (Z 2026-09-17).
        touchAction: detail ? 'auto' : 'none',
      }}
      onWheel={onWheel}
      {...surf}
    >
      {/* Ambient wash — the Tivi+ teal-green brand breath, with a violet cinema
          undertone so it reads as OUR cinema, not a generic dark grid. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          background:
            'radial-gradient(120% 72% at 50% -8%, rgba(0,168,150,0.10), transparent 62%),' +
            'radial-gradient(85% 60% at 90% 90%, rgba(0,168,150,0.06), transparent 60%),' +
            'radial-gradient(70% 50% at 12% 96%, rgba(157,78,221,0.035), transparent 60%)',
        }}
      />

      {/* SEARCH entry — reach any of the 62k by name (opens the search overlay). */}
      <button
        onClick={(e) => { e.stopPropagation(); setSearchOpen(true); }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Rechercher"
        className="fixed z-30 flex items-center justify-center rounded-full"
        style={{ top: 'max(1rem, calc(0.6rem + env(safe-area-inset-top,0px)))', right: '1rem', width: 40, height: 40, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      </button>

      <div className="px-5 pb-5">
        <h1
          className="text-[24px] font-black text-white tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}
        >
          Cinéma
        </h1>
        {/* Vendor's line — the whole shop's scale. */}
        <p className="text-[12px] text-white/45 mt-0.5">
          <span className="font-bold" style={{ color: '#2DD4BF' }}>{frCount(CATALOG_TOTAL)} films &amp; séries</span>
          {' · flip librement · '}
          <span className="text-white/35">swipe pour feuilleter, tape pour ouvrir</span>
        </p>
      </div>

      {/* zero-height marker at the stack's true (untransformed) top — measures the
          height available for the scroll clamp above. */}
      <div ref={stackTopRef} aria-hidden style={{ height: 0 }} />
      {/* Vertical shelf-stack — translateY snaps the active strip into place; the
          neighbours peek above/below, dimmed + shrunk (the vendor's eye depth). The
          scroll is clamped to maxScrollPx so the last shelves fill the screen. */}
      <div
        className="section-glow"
        style={{
          transform: `translateY(${-Math.min(shelfIdx * SHELF_SLOT, maxScrollPx)}px)`,
          transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform',
        }}
      >
        {shelves.map((shelf, i) => (
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

      {/* Detail overlay — one robust modal for both (works with or without a
          trailer). Movies play the VOD directly; series open the episode picker. */}
      {detail && detail.kind === 'movie' && (
        <ContentDetailModal
          streamId={detail.id}
          name={detail.name}
          poster={detail.poster}
          rating={detail.rating}
          containerExtension={(detail.raw as VodStream).container_extension}
          type="movie"
          tmdbData={tmdbMap[`m:${detail.id}`]}
          credentials={credentials}
          onPlay={() => playMovie(detail.raw as VodStream)}
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

      {/* SEARCH overlay — its OWN scroll (touch-action:auto), above the wall; a tap
          hands the item to the existing detail → play path. Contained: never touches
          the swipe-surf. (Z 2026-09-17) */}
      {searchOpen && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'rgba(7,9,14,0.97)', touchAction: 'auto', paddingTop: 'env(safe-area-inset-top,0px)' }}>
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex items-center gap-2 flex-1 rounded-full px-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', height: 44 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un film, une série…" className="flex-1 bg-transparent outline-none text-white text-[15px]" style={{ minWidth: 0 }} />
              {query && <button onClick={() => setQuery('')} className="text-white/40 text-[18px] leading-none px-1" aria-label="Effacer">×</button>}
            </div>
            <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }} className="text-white/70 text-[14px] px-1">Fermer</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
            {searching && <p className="text-white/40 text-[13px] py-6 text-center">Recherche…</p>}
            {!searching && query.trim().length >= 2 && results.length === 0 && <p className="text-white/40 text-[13px] py-6 text-center">Aucun résultat pour « {query.trim()} »</p>}
            {query.trim().length < 2 && <p className="text-white/30 text-[12px] py-6 text-center">Tape au moins 2 lettres — films &amp; séries dans tout le catalogue.</p>}
            <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {results.map((it) => (
                <button key={it.kind + it.id} onClick={() => { setSearchOpen(false); setDetail(it); }} className="text-left">
                  <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '2 / 3', background: 'rgba(255,255,255,0.06)' }}>
                    {it.poster
                      ? <img src={it.poster} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      : <div className="w-full h-full grid place-items-center text-white/25 text-[10px] px-1 text-center">{it.name}</div>}
                  </div>
                  <p className="text-white/70 text-[11px] mt-1 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Le Mur — gate on the recommendation-engine curated shelves (Pour Vous · Tendance ·
 *  Dash · Pépites), prepend them ABOVE the category shelves, then render the surface.
 *  A 4s fallback guarantees the wall always mounts even if the rec pass is slow or
 *  empty (it falls back to the category shelves alone). (Z 2026-09-17) */
export const CinemaWallPage: React.FC<Props> = (props) => {
  const [recShelves, setRecShelves] = useState<WallShelfDef[] | null>(null);
  useEffect(() => {
    let alive = true;
    buildRecMovieShelves()
      .then(rs => { if (alive) setRecShelves(rs); })
      .catch(() => { if (alive) setRecShelves([]); });
    const t = setTimeout(() => { if (alive) setRecShelves(prev => (prev === null ? [] : prev)); }, 4000);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  const shelves = useMemo(
    () => (recShelves && recShelves.length ? [...recShelves, ...SHELVES] : SHELVES),
    [recShelves],
  );
  if (recShelves === null) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#07090e', color: 'rgba(255,255,255,.45)', fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Cinéma…
      </div>
    );
  }
  return <WallSurface {...props} shelves={shelves} />;
};
