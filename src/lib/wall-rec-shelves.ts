/**
 * wall-rec-shelves — recommendation-engine-driven curated shelves for the TOP of
 * Le Mur. The category shelves (wall-shelves.ts) give breadth; these give the
 * "beat-Netflix" curation: Pour Vous, Tendance, Dash-curated, Pépites — computed by
 * the same engine (recommendations.ts) the old MoviesPage used, over a fast working
 * pool of quality movies, returned as WallShelves that carry PRE-LOADED items
 * (categoryIds empty → useWallShelves serves them directly, no paging). (Z 2026-09-17)
 */
import { getVodByCategory, vodDbToStream, getTmdbMap } from '@/lib/xtream';
import type { VodStream } from '@/lib/xtream';
import { readSignals, buildAffinity, recommendFor, trendingNow, dashCurated, hiddenGems } from '@/lib/recommendations';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { MOVIE_TABS } from '@/lib/movie-collections';
import type { WallShelf, WallItem } from '@/lib/wall-shelves';

const NEW_DROPS = ['749', '597', '525'];

function catsFor(parentId: string): string[] {
  const p = MOVIE_TABS.find(t => t.id === parentId);
  if (!p) return [];
  const out = new Set<string>();
  p.subtabs.forEach(s => s.categoryIds.forEach(id => out.add(id)));
  return [...out];
}

/** The minimal shape the rec functions return (RankedRow) that we consume here. */
interface RankedLike { id: string; name: string; items: Array<{ id: number; name: string; poster: string; rating?: string | number }> }

const ACC = { forYou: '#8B5CF6', trending: '#F4C948', curated: '#22D3EE', gems: '#F472B6' };

/** Curated, engine-driven movie shelves — Pour Vous · Tendance · Dash · Pépites. */
export async function buildRecMovieShelves(): Promise<WallShelf[]> {
  try {
    // Fast working pool: fresh drops + Hollywood + Netflix, a slice of categories.
    const catIds = [...new Set([...NEW_DROPS, ...catsFor('hollywood'), ...catsFor('netflix')])].slice(0, 18);
    const pages = await Promise.allSettled(catIds.map(id => getVodByCategory(id, 250)));

    const seen = new Set<number>();
    const gemSet = new Set<number>();
    const movies: VodStream[] = [];
    const byId = new Map<number, VodStream>();
    for (const pg of pages) {
      if (pg.status !== 'fulfilled') continue;
      for (const r of pg.value) {
        const m = vodDbToStream(r);
        if (!m || seen.has(m.stream_id)) continue;
        seen.add(m.stream_id);
        movies.push(m);
        byId.set(m.stream_id, m);
        if ((r as { gem?: boolean }).gem) gemSet.add(m.stream_id);
      }
      if (movies.length >= 2000) break;
    }
    if (movies.length < 20) return [];

    const tmdbMap: Record<string, TmdbEntry> = (await getTmdbMap().catch(() => null))?.TMDB_MAP ?? {};
    const signals = readSignals();
    const affinity = buildAffinity(tmdbMap, signals);

    const toShelf = (row: RankedLike | null, accent: string): WallShelf | null => {
      if (!row || !row.items || row.items.length < 4) return null;
      const items: WallItem[] = [];
      for (const ri of row.items) {
        const raw = byId.get(ri.id);
        if (raw) items.push({ kind: 'movie', id: ri.id, name: ri.name, poster: ri.poster, rating: String(ri.rating ?? ''), raw });
      }
      if (items.length < 4) return null;
      return { id: `rec-${row.id}`, label: row.name, accent, kind: 'movie', categoryIds: [], items };
    };

    const out: WallShelf[] = [];
    const push = (row: RankedLike | null, accent: string) => { const s = toShelf(row, accent); if (s) out.push(s); };

    push(recommendFor(movies, 'movie', tmdbMap, affinity, {}, signals) as RankedLike | null, ACC.forYou);
    push(trendingNow(movies, 'movie', tmdbMap, { isTop10: true }) as RankedLike | null, ACC.trending);
    push(dashCurated(movies, 'movie', tmdbMap, { gemSet: gemSet.size ? gemSet : undefined }) as RankedLike | null, ACC.curated);
    push(hiddenGems(movies, 'movie', tmdbMap, { salt: 'wall' }) as RankedLike | null, ACC.gems);
    return out;
  } catch {
    return [];
  }
}
