/**
 * HollywoodVodRow — a Cinema gateway on Home.
 * Surfaces a real Hollywood VOD (movies) row so Home isn't Live-only: tap a cover
 * to watch, or the row's NeonGate → the full Cinema wall (/wall). Reuses the same
 * VeeCollectionRow + PosterCard + VOD catalog the Cinema page uses (Aziz 2026-09-17).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getVodByCategory, vodDbToStream, getTmdbMap, buildVodUrl, buildVodFallbackUrl } from '@/lib/xtream';
import type { XtreamCredentials, VodStream } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { Channel } from '@/types';
import { VeeCollectionRow } from '@/components/ui/VeeCollectionRow';

// Hollywood "Latest" categories (matches movie-collections `hollywood` → hw-latest).
const HOLLYWOOD_CATS = ['749', '597'];

export const HollywoodVodRow: React.FC<{ credentials: XtreamCredentials; onPlay: (ch: Channel) => void }> = React.memo(({ credentials, onPlay }) => {
  const [streams, setStreams] = useState<VodStream[]>([]);
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEntry>>({});

  useEffect(() => {
    let ok = true;
    Promise.all(HOLLYWOOD_CATS.map((id) => getVodByCategory(id, 40).catch(() => [])))
      .then((pages) => {
        if (!ok) return;
        const seen = new Set<number>();
        const merged: VodStream[] = [];
        for (const rows of pages) for (const r of rows) {
          const s = vodDbToStream(r);
          if (s && !seen.has(s.stream_id)) { seen.add(s.stream_id); merged.push(s); }
        }
        setStreams(merged);
      })
      .catch(() => {});
    getTmdbMap().then((m) => { if (ok && m) setTmdbMap(m.TMDB_MAP); }).catch(() => {});
    return () => { ok = false; };
  }, []);

  const items = useMemo(
    () => streams.slice(0, 24).map((s) => ({ id: s.stream_id, name: s.name, poster: s.stream_icon || '', tmdbKey: `m:${s.stream_id}` })),
    [streams],
  );
  const byId = useMemo(() => { const m: Record<number, VodStream> = {}; streams.forEach((s) => { m[s.stream_id] = s; }); return m; }, [streams]);

  if (items.length < 3) return null;

  const playMovie = (id: number) => {
    const s = byId[id];
    if (!s) return;
    const ext = s.container_extension || 'mp4';
    onPlay({
      id: `vod-${s.stream_id}`,
      name: s.name,
      url: buildVodUrl(credentials, s.stream_id, ext),
      logo: s.stream_icon,
      category: 'movie',
      fallbackUrl: buildVodFallbackUrl(credentials, s.stream_id, ext, 'movie'),
    });
  };

  return (
    <VeeCollectionRow
      name="Hollywood"
      tagline="Le cinéma, en un tap"
      items={items}
      tmdbMap={tmdbMap}
      onItemClick={playMovie}
      navigateTo="/wall"
      countLabel="films"
      accent="#E8B04B"
      editorial
    />
  );
});
