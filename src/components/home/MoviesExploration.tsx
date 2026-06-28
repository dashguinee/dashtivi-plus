import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import {
  getVodByCategory,
  vodDbToStream,
  getTmdbMap,
  buildVodUrl,
  buildVodFallbackUrl,
} from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { TMDB_GENRES } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { ContentDetailModal } from '@/components/ui/ContentDetailModal';
import { showcaseFocusRegistry } from '@/components/ui/FreeHlsShowcaseCard';
import { tap } from '@/lib/haptics';
import type { Channel } from '@/types';

/* ════════════════════════════════════════════════════════════════════
   MOVIES EXPLORATION — the discovery beat of the home canvas.

   "Home is THE happening place — it's exploration." As the ONE infinite
   home scroll continues past the Stream+ free showcase, content stays
   ALIVE as you pass it: a strip of movie posters + large cards whose
   YouTube trailers AUTO-PLAY the moment they reach viewport-center.

   Concurrency: the auto-play cards JOIN the same singleton
   `showcaseFocusRegistry` the free-HLS showcase uses — so there is still
   exactly ONE live surface at a time across the whole canvas (a playing
   trailer counts as THE one live surface, exactly like a live HLS card).

   Reuse: PosterCard + ContentDetailModal + the TMDB trailer (`tmdb.y`) +
   the exact YouTube embed params from the modal. Nothing new invented.

   GATING is the caller's job (HomePage decides free=loud / premium=calm).
   ════════════════════════════════════════════════════════════════════ */

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const ACCENT = '#9D4EDD';

// New & Hot pool — same categories the Movies "New & Hot" tab uses. Trailer
// density is highest here, so the auto-play exploration lands on real trailers.
const EXPLORE_CATEGORY_IDS = ['749', '597', '766', '599'];

interface Props {
  credentials: XtreamCredentials;
  onPlay: (channel: Channel) => void;
  /** How many big auto-play trailer cards to feature (rest become a poster strip). */
  featured?: number;
}

function parseYear(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  return m ? parseInt(m[1], 10) : 0;
}

export const MoviesExploration: React.FC<Props> = ({ credentials, onPlay, featured = 3 }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<VodStream[]>([]);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});
  const [detailMovie, setDetailMovie] = useState<VodStream | null>(null);

  // Load TMDB map + the trailer-rich pool (Supabase-first, silent on failure —
  // exploration is a bonus beat; if it can't load, the section just hides).
  useEffect(() => {
    let alive = true;
    getTmdbMap().then((m) => { if (alive && m) setTmdbMap(m.TMDB_MAP); }).catch(() => {});
    Promise.allSettled(EXPLORE_CATEGORY_IDS.map((id) => getVodByCategory(id, 120)))
      .then((results) => {
        if (!alive) return;
        const seen = new Set<number>();
        const merged: VodStream[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const it of r.value) {
              if (!seen.has(it.id)) { seen.add(it.id); merged.push(vodDbToStream(it)); }
            }
          }
        }
        setMovies(merged);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Split the pool: trailer-bearing, highest-rated-recent → the big auto-play
  // cards; everything with a poster → the discovery strip below them.
  const { featuredItems, stripItems } = useMemo(() => {
    if (movies.length === 0) return { featuredItems: [] as VodStream[], stripItems: [] as VodStream[] };
    const scored = movies
      .map((m) => {
        const tmdb = tmdbMap[`m:${m.stream_id}`];
        const year = parseYear(m.name);
        const score = (tmdb?.r || 0) + (year >= 2025 ? 2 : year >= 2024 ? 1 : 0);
        return { m, tmdb, score, hasTrailer: !!tmdb?.y };
      })
      .sort((a, b) => b.score - a.score);

    const withTrailer = scored.filter((s) => s.hasTrailer);
    const featuredItems = withTrailer.slice(0, featured).map((s) => s.m);
    const featuredIds = new Set(featuredItems.map((m) => m.stream_id));
    // Strip = everything else with a usable poster, capped (curated, not a dump).
    const stripItems = scored
      .filter((s) => !featuredIds.has(s.m.stream_id) && (s.m.stream_icon || s.tmdb?.p))
      .slice(0, 18)
      .map((s) => s.m);
    return { featuredItems, stripItems };
  }, [movies, tmdbMap, featured]);

  const openMovie = useCallback(
    (m: VodStream) => {
      const tmdb = tmdbMap[`m:${m.stream_id}`];
      const ext = m.container_extension || 'mp4';
      onPlay({
        id: `vod-${m.stream_id}`,
        name: m.name,
        url: buildVodUrl(credentials, m.stream_id, ext),
        logo: m.stream_icon,
        category: 'movie',
        knownDuration: tmdb?.t ? tmdb.t * 60 : undefined,
        fallbackUrl: buildVodFallbackUrl(credentials, m.stream_id, ext, 'movie'),
      });
    },
    [credentials, tmdbMap, onPlay]
  );

  // Nothing to show yet (or pool empty) → render nothing (the canvas just flows on).
  if (featuredItems.length === 0 && stripItems.length === 0) return null;

  return (
    <section className="mt-2 mb-7" style={{ animation: `row-in 0.55s ${EASE} both` }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` }}
          />
          <h2 className="text-[19px] font-black tracking-tight text-white truncate">
            {lang === 'fr' ? 'Films à la Une' : 'Featured Films'}
          </h2>
        </div>
        <button
          onClick={() => navigate('/movies')}
          className="flex items-center gap-0.5 text-[11px] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
        >
          {lang === 'fr' ? 'Tout voir' : 'See all'}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Big auto-play trailer cards — one lives at a time (shared registry). */}
      <div className="space-y-4 px-4">
        {featuredItems.map((m) => (
          <TrailerExploreCard
            key={m.stream_id}
            movie={m}
            tmdb={tmdbMap[`m:${m.stream_id}`]}
            onOpen={() => { tap(); setDetailMovie(m); }}
          />
        ))}
      </div>

      {/* Discovery strip — a simple horizontal scroll of posters. Tap a poster
          to open its detail. */}
      {stripItems.length > 0 && (
        <div className="flex gap-3.5 overflow-x-auto scrollbar-hide px-4 pt-4 pb-1 items-end">
          {stripItems.map((m) => (
            <div key={m.stream_id} className="flex-shrink-0" style={{ width: 118 }}>
              <PosterCard
                title={m.name}
                poster={m.stream_icon}
                rating={m.rating}
                tmdbData={tmdbMap[`m:${m.stream_id}`]}
                onClick={() => { tap(); setDetailMovie(m); }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail modal — reuse, plays through the same player as everything else. */}
      {detailMovie && (
        <ContentDetailModal
          streamId={detailMovie.stream_id}
          name={detailMovie.name}
          poster={detailMovie.stream_icon}
          rating={detailMovie.rating}
          containerExtension={detailMovie.container_extension}
          type="movie"
          tmdbData={tmdbMap[`m:${detailMovie.stream_id}`]}
          credentials={credentials}
          onPlay={() => { openMovie(detailMovie); setDetailMovie(null); }}
          onClose={() => setDetailMovie(null)}
        />
      )}
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   TrailerExploreCard — a 16:9 card whose YouTube trailer AUTO-PLAYS only
   while it is the focused (viewport-centered) surface. Joins the shared
   `showcaseFocusRegistry`, so it competes with the free-HLS cards for the
   single live slot: one playing trailer = THE one live surface.
   ───────────────────────────────────────────────────────────────────── */
function TrailerExploreCard({
  movie,
  tmdb,
  onOpen,
}: {
  movie: VodStream;
  tmdb?: TmdbEntry;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [focused, setFocused] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);

  const trailerKey = tmdb?.y || null;
  const backdrop = tmdb?.p ? `https://image.tmdb.org/t/p/w780${tmdb.p}` : (movie.stream_icon || '');
  const cleanTitle = movie.name.replace(/\s*\(\d{4}\)\s*$/, '');
  const genres = (tmdb?.g || []).map((id) => TMDB_GENRES[id]).filter(Boolean).slice(0, 2);

  // IntersectionObserver → claim/release into the SHARED singleton registry.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        const visible = e.isIntersecting && e.intersectionRatio >= 0.55;
        if (visible) showcaseFocusRegistry.claim(el, setFocused);
        else showcaseFocusRegistry.release(el);
      },
      { threshold: [0, 0.55, 0.85, 1], rootMargin: '-6% 0px -6% 0px' }
    );
    io.observe(el);
    return () => { io.disconnect(); showcaseFocusRegistry.release(el); };
  }, []);

  // Reset the "ready" fade when focus drops (iframe unmounts on blur).
  useEffect(() => {
    if (!focused) setTrailerReady(false);
  }, [focused]);

  // Hold the calm poster for 5s AFTER the trailer is ready — the muted video
  // plays underneath the whole time, then the poster fades to reveal it.
  const [revealVideo, setRevealVideo] = useState(false);
  useEffect(() => {
    if (!trailerReady) { setRevealVideo(false); return; }
    const t = setTimeout(() => setRevealVideo(true), 5000);
    return () => clearTimeout(t);
  }, [trailerReady]);

  const showTrailer = focused && !!trailerKey;

  return (
    <div
      ref={cardRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden"
      data-focused={focused ? 'true' : 'false'}
      style={{
        boxShadow: focused
          ? `0 12px 44px rgba(157,78,221,0.22), 0 0 0 1px rgba(157,78,221,0.40)`
          : `0 5px 22px rgba(157,78,221,0.12), 0 0 0 1px rgba(157,78,221,0.18)`,
        transition: `transform 0.6s ${EASE}, box-shadow 0.6s ${EASE}, opacity 0.6s ${EASE}`,
        transform: focused ? 'scale(1)' : 'scale(0.975)',
        opacity: focused ? 1 : 0.92,
      }}
    >
      {/* Backdrop (always present — the calm poster beneath the trailer). */}
      {backdrop && (
        <img
          src={backdrop}
          alt={cleanTitle}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: showTrailer && revealVideo ? 0 : 1, transition: `opacity 0.7s ${EASE}` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(10,6,18,0.25) 0%, rgba(6,6,12,0.55) 60%, rgba(6,6,12,0.92) 100%)' }}
      />

      {/* Auto-playing trailer — muted (the focus engine owns the one live slot).
          Identical YouTube embed params to ContentDetailModal. */}
      {showTrailer && (
        <iframe
          ref={iframeRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            border: 0,
            opacity: revealVideo ? 1 : 0,
            transition: `opacity 0.7s ${EASE}`,
            // YouTube embeds letterbox 16:9 already; scale a touch to bleed edges.
            transform: 'scale(1.02)',
          }}
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3&disablekb=1&start=5&autoplay=1&mute=1&enablejsapi=1&playsinline=1&loop=1&playlist=${trailerKey}`}
          allow="autoplay; encrypted-media"
          onLoad={() => setTrailerReady(true)}
          title={`${cleanTitle} trailer`}
        />
      )}

      {/* Purple brand mask — same as the full trailer: a strong violet-dark base
          covers YouTube's logo (bottom), a 7% violet wash tints the rest DASH-purple. */}
      {showTrailer && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(18,9,32,0.94) 0%, rgba(157,78,221,0.11) 12%, rgba(157,78,221,0.07) 50%, rgba(157,78,221,0.10) 84%, rgba(14,7,26,0.82) 100%)',
            opacity: revealVideo ? 1 : 0,
            transition: `opacity 0.7s ${EASE}`,
          }}
        />
      )}

      {/* (Trailer / Preview tag removed per design — let the art speak.) */}

      {/* Title + meta + play — bottom (tap anywhere opens the detail modal). */}
      <button onClick={onOpen} className="absolute inset-0 text-left" aria-label={`Open ${cleanTitle}`}>
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] leading-tight font-black text-white tracking-tight line-clamp-2">
              {cleanTitle}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {tmdb?.r ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {tmdb.r.toFixed(1)}
                </span>
              ) : null}
              {genres.map((g) => (
                <span key={g} className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] text-white/55 font-medium">{g}</span>
              ))}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

export default MoviesExploration;
