import React, { useMemo, useState } from 'react';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { MoviesTrailerSpace } from '@/components/home/MoviesTrailerSpace';
import { tap } from '@/lib/haptics';
import type { Channel } from '@/types';

/* ════════════════════════════════════════════════════════════════════
   FLOATING-MOVIES SHOWCASE — the entry to the Movies media space.

   "Navigation = movement through media spaces, not page transitions."
   The purple breath (App.tsx #merge-breath) dissolves the live world; out
   of it THIS condenses — a cinematic, full-bleed dark showcase where a
   handful of movie posters FLOAT softly at different depths/sizes, some
   half-hidden in the dark, drifting slowly. A cinema materializing in the
   dark — NOT a grid.

   Tapping a floating poster opens that movie's trailer via the existing
   ContentDetailModal (no new trailer playback invented). Posters are drawn
   from the SAME VOD pool MoviesPage already loaded (passed in as props —
   no extra fetch). Below this, MoviesPage's normal grid continues, so the
   scroll flows showcase → grid with no break.

   Motion is GPU-cheap (transform/opacity only) and reduced-motion freezes
   the drift (CSS in globals.css).
   ════════════════════════════════════════════════════════════════════ */

const TMDB_BACKDROP = (p: string) => `https://image.tmdb.org/t/p/w780${p}`;

// Hand-placed "constellation" — each slot has a position, size, depth-opacity,
// drift track + duration. Depths/sizes vary so it reads as a 3D scatter, not a
// row. `dim` slots sit lower-opacity / partly behind the vignette (emerging from
// the dark). Percent-based so it scales across phone widths. Ordered roughly
// back-to-front (z) — the near, brighter ones drawn last.
interface Slot {
  left: string; top: string; w: string; // w in vw for fluid sizing
  z: number; opacity: number; blur?: number;
  drift: 'a' | 'b' | 'c' | 'd'; dur: number; delay: number;
}
const SLOTS: Slot[] = [
  // far, dim — emerging from the dark at the edges
  { left: '4%',  top: '8%',  w: '24vw', z: 1, opacity: 0.32, blur: 1.4, drift: 'b', dur: 17, delay: 0 },
  { left: '74%', top: '6%',  w: '22vw', z: 1, opacity: 0.34, blur: 1.2, drift: 'd', dur: 19, delay: 1.5 },
  { left: '82%', top: '52%', w: '26vw', z: 2, opacity: 0.40, blur: 0.8, drift: 'c', dur: 16, delay: 0.8 },
  { left: '2%',  top: '54%', w: '27vw', z: 2, opacity: 0.44, blur: 0.6, drift: 'a', dur: 18, delay: 2.1 },
  // mid
  { left: '24%', top: '40%', w: '30vw', z: 3, opacity: 0.62, drift: 'c', dur: 15, delay: 0.4 },
  { left: '56%', top: '30%', w: '31vw', z: 3, opacity: 0.66, drift: 'b', dur: 16, delay: 1.1 },
  // near, brightest — the hero floaters
  { left: '40%', top: '8%',  w: '36vw', z: 4, opacity: 0.92, drift: 'a', dur: 14, delay: 0.2 },
  { left: '14%', top: '22%', w: '34vw', z: 4, opacity: 0.85, drift: 'd', dur: 15, delay: 1.6 },
  { left: '62%', top: '60%', w: '33vw', z: 4, opacity: 0.88, drift: 'b', dur: 14, delay: 0.6 },
];

interface Props {
  credentials: XtreamCredentials;
  movies: VodStream[];
  tmdbMap: Record<string, TmdbEntry>;
  onPlay: (channel: Channel) => void;
}

function parseYear(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  return m ? parseInt(m[1], 10) : 0;
}

export const FloatingMoviesShowcase: React.FC<Props> = ({ credentials, movies, tmdbMap, onPlay }) => {
  const [detailMovie, setDetailMovie] = useState<VodStream | null>(null);

  // Pick visually-strong floaters: must have a TMDB backdrop (or a poster),
  // prefer rated + recent so the cinema feels alive. Each gets a resolved image.
  const floaters = useMemo(() => {
    if (movies.length === 0) return [] as { movie: VodStream; img: string }[];
    const scored = movies
      .map((m) => {
        const tmdb = tmdbMap[`m:${m.stream_id}`];
        const img = tmdb?.p ? TMDB_BACKDROP(tmdb.p) : (m.stream_icon || '');
        if (!img) return null;
        const year = parseYear(m.name);
        const score = (tmdb?.r || 0) + (tmdb?.p ? 1.5 : 0) + (year >= 2025 ? 2 : year >= 2024 ? 1 : 0);
        return { movie: m, img, score };
      })
      .filter((x): x is { movie: VodStream; img: string; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);

    // De-dup by image so two slots never show the same backdrop.
    const seen = new Set<string>();
    const picked: { movie: VodStream; img: string }[] = [];
    for (const s of scored) {
      if (seen.has(s.img)) continue;
      seen.add(s.img);
      picked.push({ movie: s.movie, img: s.img });
      if (picked.length >= SLOTS.length) break;
    }
    return picked;
  }, [movies, tmdbMap]);

  // Pool not ready (or empty) → render nothing; the page's hero/grid just flow.
  if (floaters.length < 5) return null;

  // Showcase height: a tall, immersive dark stage that flows into the grid.
  return (
    <div
      className="fm-showcase"
      style={{ height: 'clamp(360px, 64vh, 560px)' }}
      aria-label="Featured films"
    >
      {floaters.map(({ movie, img }, i) => {
        const slot = SLOTS[i];
        const tmdb = tmdbMap[`m:${movie.stream_id}`];
        const cleanTitle = movie.name.replace(/\s*\(\d{4}\)\s*$/, '');
        return (
          <button
            key={movie.stream_id}
            className="fm-poster"
            onClick={() => { tap(); setDetailMovie(movie); }}
            aria-label={`Open ${cleanTitle}`}
            style={{
              left: slot.left,
              top: slot.top,
              width: slot.w,
              aspectRatio: '2 / 3',
              zIndex: slot.z,
              opacity: slot.opacity,
              filter: slot.blur ? `blur(${slot.blur}px)` : undefined,
              animation: `fm-drift-${slot.drift} ${slot.dur}s ease-in-out ${slot.delay}s infinite`,
            }}
          >
            <img src={img} alt={cleanTitle} width={340} height={510} loading="lazy" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Soft top-down dark wash so titles/dark posters still feel cinematic. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(160deg, rgba(157,78,221,0.05) 0%, transparent 45%, rgba(6,6,12,0.45) 100%)' }}
            />
            {tmdb?.r ? (
              <span
                className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-yellow-300"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              >
                ★ {tmdb.r.toFixed(1)}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* Edge vignette — posters emerge from / sink into the dark at the rim. */}
      <div className="fm-vignette" />

      {/* Quiet title — a whisper, content is the hero. */}
      <div className="absolute left-0 right-0 bottom-0 z-[6] px-5 pb-5 pointer-events-none">
        <h2
          className="text-[15px] font-semibold tracking-[0.12em] uppercase"
          style={{ color: 'rgba(216,180,255,0.75)' }}
        >
          Cinema
        </h2>
        <p className="text-[11px] text-white/30 mt-0.5">Tap a film to watch its trailer</p>
      </div>

      {/* Trailer SPACE — Phase B. Reuses ContentDetailModal's trailer playback
          (no rebuilt playback) but wraps it in the 4-direction navigator: swipe
          to glide to an adjacent movie's trailer (tactile-glass, same as
          HeroDeck), exit breathes back here. The VOD pool we already hold is the
          spatial model it navigates. */}
      {detailMovie && (
        <MoviesTrailerSpace
          credentials={credentials}
          initial={detailMovie}
          pool={movies}
          tmdbMap={tmdbMap}
          onPlay={onPlay}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </div>
  );
};

export default FloatingMoviesShowcase;
