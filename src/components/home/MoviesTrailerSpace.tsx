import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import { buildVodUrl, buildVodFallbackUrl } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { tap } from '@/lib/haptics';
import type { Channel } from '@/types';

/* ════════════════════════════════════════════════════════════════════
   MOVIES TRAILER SPACE — Phase B of the Movies media space.

   "Navigation = movement through media spaces, not page transitions."

   You tap a movie → its trailer plays IMMERSIVE (ContentDetailModal's own
   trailer mode, unchanged — we just drive WHICH movie it renders). While
   inside, you swipe in any of 4 DIRECTIONS to GLIDE to an adjacent movie's
   trailer:
     L / R  → previous / next movie in the CURRENT ROW (same genre)
     U / D  → jump to a DIFFERENT ROW (genre), keeping your column position
   Each swipe is the HeroDeck tactile-glass feel (1:1 drag, weighted snap,
   soft shimmer between trailers). Exit breathes back to the movies page.

   This is a WRAPPER. ContentDetailModal keeps its exact public API — every
   existing caller (MoviesPage grid, hero, FloatingMoviesShowcase) still
   works untouched. This component is opt-in: mount it instead of a raw
   ContentDetailModal when you want the 4-direction trailer navigator.
   ════════════════════════════════════════════════════════════════════ */

// ── HeroDeck tactile-glass constants (matched exactly) ───────────────
const COMMIT_FRACTION = 0.18;
const FLICK_VELOCITY = 0.32; // px/ms
const SNAP = 'transform 0.36s cubic-bezier(0.34,1.26,0.4,1)';
const GRAB_THRESHOLD = 5; // px — HeroDeck's intent threshold

interface Cell {
  movie: VodStream;
  rowKey: string;   // genre name (or 'all')
  rowIdx: number;
  colIdx: number;
}

interface Row {
  key: string;
  genreId: number; // 0 = "All / mixed"
  movies: VodStream[];
}

interface Props {
  credentials: XtreamCredentials;
  /** The movie tapped to open the space (entry point). */
  initial: VodStream;
  /** Full pool to build the 2D spatial model from (same pool the page loaded). */
  pool: VodStream[];
  tmdbMap: Record<string, TmdbEntry>;
  onPlay: (channel: Channel) => void;
  onClose: () => void;
}

const MAX_ROWS = 8;
const MAX_COLS = 30;

/** A movie is navigable in the trailer space only if it can show a trailer:
 *  it has a TMDB youtube key OR (we optimistically allow VOD-info trailers).
 *  We require the TMDB key here so a swipe never lands on a dead (no-trailer)
 *  cell that ContentDetailModal would fall back to a card for. */
function hasTrailerKey(m: VodStream, tmdbMap: Record<string, TmdbEntry>): boolean {
  return !!tmdbMap[`m:${m.stream_id}`]?.y;
}

export const MoviesTrailerSpace: React.FC<Props> = ({
  credentials, initial, pool, tmdbMap, onPlay, onClose,
}) => {
  // ── Build the 2D model: rows = genres, columns = movies ────────────
  // Only movies with a resolvable trailer key enter the grid, so every
  // glide lands on a real immersive trailer (no card fallbacks mid-swipe).
  const { rows, cellFor } = useMemo(() => {
    const trailered = pool.filter((m) => hasTrailerKey(m, tmdbMap));

    // Group by primary genre. A movie's row = its first TMDB genre that has
    // enough company; movies with no usable genre fall into a "mixed" row.
    const byGenre = new Map<number, VodStream[]>();
    for (const m of trailered) {
      const g = tmdbMap[`m:${m.stream_id}`]?.g || [];
      const primary = g[0] ?? 0;
      const arr = byGenre.get(primary) || [];
      arr.push(m);
      byGenre.set(primary, arr);
    }

    // Rows ordered by size (richest genres first), capped. Small genres are
    // folded into a single mixed row so we never get 1-movie rows that can't
    // be navigated.
    const entries = [...byGenre.entries()].sort((a, b) => b[1].length - a[1].length);
    const built: Row[] = [];
    const mixed: VodStream[] = [];
    for (const [gid, arr] of entries) {
      if (arr.length >= 4 && built.length < MAX_ROWS) {
        built.push({ key: `g${gid}`, genreId: gid, movies: arr.slice(0, MAX_COLS) });
      } else {
        mixed.push(...arr);
      }
    }
    if (mixed.length > 0) {
      built.push({ key: 'mixed', genreId: 0, movies: mixed.slice(0, MAX_COLS) });
    }

    // Always guarantee the initial movie is present in some row so the entry
    // point is navigable even if it lacks a trailer key / genre.
    const present = built.some((r) => r.movies.some((m) => m.stream_id === initial.stream_id));
    if (!present) {
      if (built.length === 0) {
        built.push({ key: 'mixed', genreId: 0, movies: [initial] });
      } else {
        built[0] = { ...built[0], movies: [initial, ...built[0].movies].slice(0, MAX_COLS) };
      }
    }

    const cellFor = (rowIdx: number, colIdx: number): Cell | null => {
      const r = built[((rowIdx % built.length) + built.length) % built.length];
      if (!r || r.movies.length === 0) return null;
      const c = ((colIdx % r.movies.length) + r.movies.length) % r.movies.length;
      return { movie: r.movies[c], rowKey: r.key, rowIdx, colIdx: c };
    };

    return { rows: built, cellFor };
  }, [pool, tmdbMap, initial.stream_id]);

  // ── Locate the entry cell ──────────────────────────────────────────
  const start = useMemo(() => {
    for (let ri = 0; ri < rows.length; ri++) {
      const ci = rows[ri].movies.findIndex((m) => m.stream_id === initial.stream_id);
      if (ci >= 0) return { rowIdx: ri, colIdx: ci };
    }
    return { rowIdx: 0, colIdx: 0 };
  }, [rows, initial.stream_id]);

  // Current position in the spatial grid.
  const [pos, setPos] = useState(start);
  useEffect(() => { setPos(start); }, [start]);

  const current = useMemo(() => cellFor(pos.rowIdx, pos.colIdx), [cellFor, pos]);

  // ── Swipe state (HeroDeck refs — no per-move re-render) ─────────────
  const dragging = useRef(false);
  const grabbed = useRef(false);
  const axis = useRef<'x' | 'y' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velX = useRef(0);
  const velY = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [shimmer, setShimmer] = useState(false);

  const sizeRef = useRef({ w: 1, h: 1 });
  useEffect(() => {
    const measure = () => { sizeRef.current = { w: window.innerWidth, h: window.innerHeight }; };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Settle to a new grid position with the tactile-glass shimmer.
  const glideTo = useCallback((rowIdx: number, colIdx: number) => {
    setPos({ rowIdx, colIdx });
    setSnapping(true);
    setDragX(0);
    setDragY(0);
    setShimmer(true);
    tap();
    window.setTimeout(() => setShimmer(false), 420);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    grabbed.current = false;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastT.current = performance.now();
    velX.current = 0;
    velY.current = 0;
    setSnapping(false);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!grabbed.current) {
      if (Math.abs(dx) < GRAB_THRESHOLD && Math.abs(dy) < GRAB_THRESHOLD) return;
      // Lock to the dominant axis — 4-direction navigation, one axis per gesture.
      axis.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      grabbed.current = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
    }

    const now = performance.now();
    const dt = now - lastT.current;
    if (dt > 0) {
      velX.current = (e.clientX - lastX.current) / dt;
      velY.current = (e.clientY - lastY.current) / dt;
    }
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastT.current = now;

    // 1:1 drag on the locked axis (HeroDeck feel). Wrap-around grid → no edge
    // resistance needed; every direction always has a neighbour.
    if (axis.current === 'x') setDragX(dx);
    else setDragY(dy);
  }, []);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!grabbed.current) { axis.current = null; return; }
    grabbed.current = false;

    const { w, h } = sizeRef.current;
    let { rowIdx, colIdx } = pos;
    let moved = false;

    if (axis.current === 'x') {
      const off = dragX, v = velX.current;
      if (off < -w * COMMIT_FRACTION || v < -FLICK_VELOCITY) { colIdx += 1; moved = true; }
      else if (off > w * COMMIT_FRACTION || v > FLICK_VELOCITY) { colIdx -= 1; moved = true; }
    } else if (axis.current === 'y') {
      const off = dragY, v = velY.current;
      // Swipe UP (negative) → next row; swipe DOWN → previous row.
      if (off < -h * COMMIT_FRACTION || v < -FLICK_VELOCITY) { rowIdx += 1; moved = true; }
      else if (off > h * COMMIT_FRACTION || v > FLICK_VELOCITY) { rowIdx -= 1; moved = true; }
    }
    axis.current = null;

    if (moved) {
      glideTo(rowIdx, colIdx);
    } else {
      // Snap back — still a settle.
      setSnapping(true);
      setDragX(0);
      setDragY(0);
    }
  }, [pos, dragX, dragY, glideTo]);

  // ── Preload the next trailer key in each direction so the swap is instant ──
  // ContentDetailModal reads tmdbData.y synchronously, so the trailer key is
  // already in-hand for any cell. We additionally warm the YouTube iframe for
  // the neighbours by mounting tiny hidden preload iframes (no autoplay), which
  // primes the CDN/connection so the visible swap renders without a cold start.
  const neighbourKeys = useMemo(() => {
    if (!current) return [] as string[];
    const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const keys = new Set<string>();
    for (const [dr, dc] of dirs) {
      const cell = cellFor(pos.rowIdx + dr, pos.colIdx + dc);
      const key = cell ? tmdbMap[`m:${cell.movie.stream_id}`]?.y : null;
      if (key && key !== tmdbMap[`m:${current.movie.stream_id}`]?.y) keys.add(key);
    }
    return [...keys];
  }, [current, cellFor, pos, tmdbMap]);

  if (!current) {
    // No spatial model possible — degrade to a plain single trailer modal so
    // the tap still does something sensible.
    return (
      <ContentDetailModal
        streamId={initial.stream_id}
        name={initial.name}
        poster={initial.stream_icon}
        rating={initial.rating}
        containerExtension={initial.container_extension}
        type="movie"
        tmdbData={tmdbMap[`m:${initial.stream_id}`]}
        credentials={credentials}
        onPlay={(d) => playMovie(initial, d, credentials, tmdbMap, onPlay, onClose)}
        onClose={onClose}
      />
    );
  }

  const m = current.movie;
  // Live drag transform on the whole trailer surface — 1:1 on the locked axis.
  const liveX = grabbed.current && axis.current === 'x' ? dragX : 0;
  const liveY = grabbed.current && axis.current === 'y' ? dragY : 0;
  const { w, h } = sizeRef.current;
  const dragProgress = Math.min(1, (Math.abs(liveX) / w) + (Math.abs(liveY) / h));

  return (
    <div
      className="fixed inset-0 z-[9998] overflow-hidden select-none"
      style={{ touchAction: 'none', background: '#000' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* The immersive trailer surface — translated 1:1 by the drag, then
          weighted-snapped back to centre as the new trailer takes its place.
          We re-key on the movie so ContentDetailModal remounts cleanly per
          glide (one live YouTube iframe at a time — see risks note). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${liveX}px, ${liveY}px, 0)`,
          transition: snapping && !reducedMotion.current ? SNAP : 'none',
          willChange: 'transform',
        }}
        onTransitionEnd={() => setSnapping(false)}
      >
        <ContentDetailModal
          key={m.stream_id}
          streamId={m.stream_id}
          name={m.name}
          poster={m.stream_icon}
          rating={m.rating}
          containerExtension={m.container_extension}
          type="movie"
          tmdbData={tmdbMap[`m:${m.stream_id}`]}
          credentials={credentials}
          onPlay={(d) => playMovie(m, d, credentials, tmdbMap, onPlay, onClose)}
          onClose={onClose}
        />
      </div>

      {/* Soft shimmer between trailers — a violet wash that blooms on settle and
          tracks live drag magnitude (the "glass between panes"). GPU-cheap:
          opacity only. Frozen under reduced-motion. */}
      <div
        className="pointer-events-none absolute inset-0 z-[9999]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 50%, rgba(157,78,221,0.22) 0%, rgba(109,40,184,0.10) 45%, transparent 75%)',
          opacity: reducedMotion.current ? 0 : (shimmer ? 0.9 : dragProgress * 0.5),
          transition: shimmer ? 'opacity 0.42s cubic-bezier(0.23,1,0.32,1)' : 'opacity 0.12s linear',
          mixBlendMode: 'screen',
        }}
      />

      {/* Directional hint glints — faint edge violet that brightens toward the
          drag direction, so the 4-way affordance reads without chrome. */}
      <DirectionGlints axis={axis.current} dx={liveX} dy={liveY} reduced={reducedMotion.current} />

      {/* Hidden trailer preloaders — warm the neighbour YouTube embeds so the
          next glide renders instantly. muted, no autoplay, 1px, off-screen. */}
      {!reducedMotion.current && neighbourKeys.map((k) => (
        <iframe
          key={`preload-${k}`}
          src={`https://www.youtube-nocookie.com/embed/${k}?rel=0&controls=0&mute=1&playsinline=1&autoplay=0`}
          title="preload"
          aria-hidden
          tabIndex={-1}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999, top: -9999 }}
        />
      ))}
    </div>
  );
};

// Faint edge glints that brighten toward the active drag direction.
const DirectionGlints: React.FC<{ axis: 'x' | 'y' | null; dx: number; dy: number; reduced: boolean }> = ({ axis, dx, dy, reduced }) => {
  if (reduced) return null;
  const mag = axis === 'x' ? Math.min(1, Math.abs(dx) / 220) : axis === 'y' ? Math.min(1, Math.abs(dy) / 320) : 0;
  const o = mag * 0.6;
  const edge = (pos: string) => ({
    position: 'absolute' as const,
    [pos]: 0,
    opacity: o,
    transition: 'opacity 0.1s linear',
    pointerEvents: 'none' as const,
  });
  return (
    <div className="absolute inset-0 z-[9999]" aria-hidden>
      {axis === 'x' && dx > 0 && <div style={{ ...edge('left'), top: 0, bottom: 0, width: '22%', background: 'linear-gradient(90deg, rgba(157,78,221,0.5), transparent)' }} />}
      {axis === 'x' && dx < 0 && <div style={{ ...edge('right'), top: 0, bottom: 0, width: '22%', background: 'linear-gradient(270deg, rgba(157,78,221,0.5), transparent)' }} />}
      {axis === 'y' && dy < 0 && <div style={{ ...edge('bottom'), left: 0, right: 0, height: '20%', background: 'linear-gradient(0deg, rgba(157,78,221,0.5), transparent)' }} />}
      {axis === 'y' && dy > 0 && <div style={{ ...edge('top'), left: 0, right: 0, height: '20%', background: 'linear-gradient(180deg, rgba(157,78,221,0.5), transparent)' }} />}
    </div>
  );
};

// Shared play handler — mirrors the existing callers' Channel construction.
function playMovie(
  movie: VodStream,
  knownDuration: number | undefined,
  credentials: XtreamCredentials,
  tmdbMap: Record<string, TmdbEntry>,
  onPlay: (c: Channel) => void,
  onClose: () => void,
) {
  const tmdb = tmdbMap[`m:${movie.stream_id}`];
  const duration = knownDuration || (tmdb?.t ? tmdb.t * 60 : undefined);
  const ext = movie.container_extension || 'mp4';
  onPlay({
    id: `vod-${movie.stream_id}`,
    name: movie.name,
    url: buildVodUrl(credentials, movie.stream_id, ext),
    logo: movie.stream_icon,
    category: 'movie',
    knownDuration: duration,
    fallbackUrl: buildVodFallbackUrl(credentials, movie.stream_id, ext, 'movie'),
  });
  onClose();
}

export default MoviesTrailerSpace;
