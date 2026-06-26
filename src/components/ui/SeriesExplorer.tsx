import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Play, ChevronLeft, Star, Download } from 'lucide-react';
import type { SeriesInfo, Episode, SeriesItem } from '@/lib/xtream';
import { safeImageUrl, buildSeriesUrl } from '@/lib/xtream';
import type { XtreamCredentials } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { t, useLanguage } from '@/i18n';
import { click as hapticClick, tap } from '@/lib/haptics';

// ── Season cover resolution ──────────────────────────────────────────
// Xtream `get_series_info` carries per-season metadata in `seasons[]`
// (cover_big / cover) and per-episode stills in `episodes[s][n].info.movie_image`.
// We pull the best available image, fall back to the series cover, then to art.

interface SeasonMeta {
  key: string;          // the episodes-map key (usually the season number as string)
  number: number;
  cover: string | null;
  episodeCount: number;
}

function readEpisodeStill(ep: Episode): string | null {
  const info = ep.info as Record<string, unknown> | undefined;
  if (!info) return null;
  const raw = (info.movie_image || info.cover_big || info.cover) as string | undefined;
  return safeImageUrl(raw) || null;
}

// ── Episode card (horizontal strip / grid) ───────────────────────────

const EpisodeCard = React.memo(function EpisodeCard({
  ep, seriesCover, onPlay, onDownload, label, idx,
}: {
  ep: Episode;
  seriesCover: string | null;
  onPlay: () => void;
  onDownload: () => void;
  label: string;
  idx: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const still = readEpisodeStill(ep) || seriesCover;
  const title = ep.title?.replace(/^\s*S\d+\s*[:.\-]?\s*E\d+\s*[:.\-]?\s*/i, '').trim() || `${label} ${ep.episode_num}`;

  return (
    <div className="group relative flex-shrink-0" style={{ width: 'clamp(150px, 42vw, 184px)' }}>
      <button
        onClick={onPlay}
        className="block w-full aspect-video rounded-xl overflow-hidden relative text-left card-press hover:scale-[1.025] active:scale-[0.97]"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {still ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 z-0" style={{
                background: 'linear-gradient(110deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 70%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite',
              }} />
            )}
            <img
              src={still} alt={title}
              className={`absolute inset-0 w-full h-full object-cover img-settle ${loaded ? 'loaded' : ''}`}
              onLoad={() => setLoaded(true)} loading="lazy" decoding="async"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.14) 0%, rgba(10,10,18,0.95) 60%)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {/* Episode number chip */}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white/90 tabular-nums"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          {ep.episode_num}
        </span>
        {/* Play affordance on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-[11px] font-semibold text-white/95 line-clamp-2 leading-tight">{title}</p>
        </div>
      </button>
      {/* Download — discreet, under the still */}
      <button
        onClick={onDownload}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        aria-label="Download"
      >
        <Download className="w-3.5 h-3.5 text-white/70" />
      </button>
      <span className="sr-only">{idx}</span>
    </div>
  );
});

// ── Season card (the smaller cards to the right of the hero) ──────────

const SeasonCard = React.memo(function SeasonCard({
  meta, seriesCover, active, label, onClick,
}: {
  meta: SeasonMeta;
  seriesCover: string | null;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const cover = meta.cover || seriesCover;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 relative rounded-xl overflow-hidden text-left card-press hover:scale-[1.03] active:scale-[0.96] transition-[box-shadow] duration-300"
      style={{
        width: 'clamp(96px, 26vw, 116px)',
        aspectRatio: '2 / 3',
        boxShadow: active
          ? '0 0 0 2px rgba(157,78,221,0.85), 0 8px 26px rgba(157,78,221,0.28)'
          : '0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {cover ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 z-0" style={{
              background: 'linear-gradient(110deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 70%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.8s ease-in-out infinite',
            }} />
          )}
          <img src={cover} alt={`${label} ${meta.number}`}
            className={`absolute inset-0 w-full h-full object-cover img-settle ${loaded ? 'loaded' : ''}`}
            onLoad={() => setLoaded(true)} loading="lazy" decoding="async" />
        </>
      ) : (
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.16) 0%, rgba(10,10,18,0.95) 60%)' }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-[12px] font-bold text-white leading-none">{label} {meta.number}</p>
        <p className="text-[9px] text-white/50 mt-0.5 tabular-nums">{meta.episodeCount} ep</p>
      </div>
      {active && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ background: '#9D4EDD', boxShadow: '0 0 8px #9D4EDD' }} />
      )}
    </button>
  );
});

// ── The explorer ─────────────────────────────────────────────────────

interface Props {
  series: SeriesItem;
  info: SeriesInfo;
  tmdbData?: TmdbEntry;
  credentials: XtreamCredentials;
  onPlayEpisode: (ep: Episode) => void;
}

export const SeriesExplorer: React.FC<Props> = ({ series, info, tmdbData, credentials, onPlayEpisode }) => {
  const { lang } = useLanguage();
  const seriesCover = useMemo(() => safeImageUrl(series.cover), [series.cover]);
  const tmdbBackdrop = tmdbData?.p ? `https://image.tmdb.org/t/p/w780${tmdbData.p}` : null;

  // Build season metadata from the episodes map (lazy data already fetched upstream).
  const seasons = useMemo<SeasonMeta[]>(() => {
    const map = info.episodes || {};
    const metaByNumber = new Map<number, { cover?: string }>();
    for (const s of info.seasons || []) {
      metaByNumber.set(s.season_number, { cover: safeImageUrl(s.cover_big || s.cover) || undefined });
    }
    return Object.keys(map)
      .map(key => {
        const eps = map[key] || [];
        const number = parseInt(key, 10) || (eps[0]?.season ?? 0);
        return {
          key,
          number,
          cover: metaByNumber.get(number)?.cover || null,
          episodeCount: eps.length,
        };
      })
      .filter(s => s.episodeCount > 0)
      .sort((a, b) => a.number - b.number);
  }, [info]);

  // Drill state: which season is expanded. Default to first season open.
  const [openKey, setOpenKey] = useState<string>(() => seasons[0]?.key ?? '');
  useEffect(() => { setOpenKey(seasons[0]?.key ?? ''); }, [seasons]);

  const seasonLabel = t(lang, 'season');
  const episodeLabel = t(lang, 'episode');

  const openSeason = seasons.find(s => s.key === openKey) || null;
  // Cap episodes rendered at once (perf on huge seasons); reveal-all is one tap.
  const EP_CAP = 60;
  const [showAllEps, setShowAllEps] = useState(false);
  useEffect(() => { setShowAllEps(false); }, [openKey]);
  const allEpisodes = openSeason ? (info.episodes[openSeason.key] || []) : [];
  const episodes = showAllEps ? allEpisodes : allEpisodes.slice(0, EP_CAP);

  const epRowRef = useRef<HTMLDivElement>(null);
  const handleSeasonClick = useCallback((key: string) => {
    tap();
    setOpenKey(key);
    // Bring the episode strip into view (one-shot, respects reduced-motion via browser).
    requestAnimationFrame(() => {
      epRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleDownload = useCallback((ep: Episode) => {
    const ext = ep.container_extension || 'mp4';
    const url = buildSeriesUrl(credentials, ep.id, ext);
    const a = document.createElement('a');
    a.href = url;
    const sName = (series.name || 'series').replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 60);
    const eName = (ep.title || `E${ep.episode_num}`).replace(/[^a-zA-Z0-9\s\-_.()]/g, '').replace(/\s+/g, '_').substring(0, 40);
    a.download = `${sName}_S${ep.season}_${eName}.${ext}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [credentials, series.name]);

  const yearMatch = series.name.match(/\((\d{4})\)/);
  const cleanName = series.name.replace(/\s*\(\d{4}\)\s*$/, '');
  const rating = tmdbData?.r && tmdbData.r > 0 ? tmdbData.r.toFixed(1) : (series.rating && parseFloat(series.rating) > 0 ? series.rating : null);

  return (
    <div className="overflow-y-auto" style={{ maxHeight: '62vh' }}>
      {/* ── SHELF: BIG hero card on the left, SEASON strip on the right ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-4 items-stretch">
          {/* BIG hero card — the series, outlined */}
          <div className="flex-shrink-0 relative rounded-2xl overflow-hidden"
            style={{ width: 'clamp(124px, 34vw, 152px)', aspectRatio: '2 / 3', boxShadow: '0 0 0 1px rgba(157,78,221,0.25), 0 12px 34px rgba(0,0,0,0.5)' }}>
            {(tmdbBackdrop || seriesCover) ? (
              <img src={seriesCover || tmdbBackdrop!} alt={cleanName}
                className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
            ) : (
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.2), rgba(10,10,18,0.95))' }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
              {rating && (
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-[11px] text-yellow-400 font-bold">{rating}</span>
                </div>
              )}
              <h3 className="text-[13px] font-black text-white leading-tight line-clamp-2">{cleanName}</h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                {seasons.length} {seasons.length === 1 ? seasonLabel : `${seasonLabel}s`}
                {yearMatch ? ` · ${yearMatch[1]}` : ''}
              </p>
            </div>
          </div>

          {/* SEASON strip — smaller cards, horizontal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9D4EDD', boxShadow: '0 0 7px #9D4EDD' }} />
              <h4 className="text-[12px] font-semibold text-white/70 uppercase tracking-wide">{seasonLabel}s</h4>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-fade pb-1 items-stretch">
              {seasons.map((s, i) => (
                <div key={s.key} style={{ animation: i < 10 ? `vee-card-in 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both` : undefined }}>
                  <SeasonCard
                    meta={s} seriesCover={seriesCover} active={s.key === openKey}
                    label={seasonLabel} onClick={() => handleSeasonClick(s.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DRILL: episodes of the open season ── */}
      <div ref={epRowRef} className="px-4 pt-4 pb-5">
        {openSeason && (
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[14px] font-bold text-white flex items-center gap-2">
              <ChevronLeft className="w-4 h-4 text-primary-light rotate-[-90deg]" />
              {seasonLabel} {openSeason.number}
              <span className="text-[11px] font-normal text-white/40 tabular-nums">{openSeason.episodeCount} {episodeLabel.toLowerCase()}s</span>
            </h4>
          </div>
        )}

        {episodes.length > 0 ? (
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-3 animate-slide-up" style={{ animationDuration: '0.4s' }}>
            {episodes.map((ep, i) => (
              <EpisodeCard
                key={ep.id}
                ep={ep}
                seriesCover={seriesCover}
                label={episodeLabel}
                idx={i}
                onPlay={() => { hapticClick(); onPlayEpisode(ep); }}
                onDownload={() => handleDownload(ep)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-6">{t(lang, 'noEpisodes')}</p>
        )}

        {!showAllEps && allEpisodes.length > EP_CAP && (
          <button
            onClick={() => { tap(); setShowAllEps(true); }}
            className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-semibold tracking-wide transition-transform active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.14), rgba(157,78,221,0.05))', border: '1px solid rgba(157,78,221,0.22)', color: 'rgba(201,160,255,0.9)' }}
          >
            {allEpisodes.length - EP_CAP} more {episodeLabel.toLowerCase()}s
          </button>
        )}
      </div>
    </div>
  );
};
