/**
 * "Le Mur" — the cinema cover-wall shelves (v3: movies + series, one wall).
 *
 * The whole shop is ONE wall. Movie strips (from MOVIE_TABS) AND series strips
 * (from SERIES_TABS platforms) stack vertically — flip ←→ through a strip, snap
 * ↑↓ between them. There is no separate Movies screen and no separate Series
 * screen anymore: this IS the cinema, next to Live. Each shelf resolves a set of
 * Xtream category IDs, paged lazily (getVodByCategory / getSeriesByCategory) into
 * an endless strip of covers.
 *
 * v3 vs v2: shelves carry a `kind` ('movie' | 'series'); the loader and the wall
 * fetch + open the right thing per kind. categoryIds stay derived from the same
 * source of truth the classic pages used (MOVIE_TABS / SERIES_TABS) so the wall
 * never drifts.
 */
import { MOVIE_TABS } from '@/lib/movie-collections';
import type { VodStream, SeriesItem } from '@/lib/xtream';

export type ShelfKind = 'movie' | 'series';

export interface WallShelf {
  id: string;
  label: string;
  accent: string;
  kind: ShelfKind;
  categoryIds: string[];
  /** Vendor's "🔥 Ce soir" accent — the freshest strip, flagged for the eye. */
  hot?: boolean;
}

/**
 * One cover on the wall — movie or series, unified so a single shelf renders both
 * and the wall opens the right detail. `raw` carries the source object the detail
 * overlay needs (a VodStream for movies, a SeriesItem for series).
 */
export interface WallItem {
  kind: ShelfKind;
  id: number;                 // stream_id (movie) | series_id (series)
  name: string;
  poster: string;             // stream_icon (movie) | cover (series)
  rating?: string;
  raw: VodStream | SeriesItem;
}

// New Drops — the freshest English releases (ENG FHD 2026/2025/2024). Mirrors
// MoviesPage's NEW_DROPS_CATEGORY_IDS so the two surfaces surface the same drops.
const NEW_DROPS_CATEGORY_IDS = ['749', '597', '525'];

/** Flatten + dedupe all subtab categoryIds for a given MOVIE_TABS parent. */
function parentCategoryIds(parentId: string): string[] {
  const parent = MOVIE_TABS.find(t => t.id === parentId);
  if (!parent) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sub of parent.subtabs) {
    for (const id of sub.categoryIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// Per-strip accent — each strip owns a colour so the vendor's eye reads depth.
const MOVIE_ACCENT: Record<string, string> = {
  hollywood: '#E8B04B',    // candle gold
  netflix: '#E50914',      // Netflix red
  collections: '#9D4EDD',  // franchise violet
  kids: '#38BDF8',         // playful sky
};
const MOVIE_LABEL: Record<string, string> = {
  hollywood: 'Hollywood',
  netflix: 'Netflix',
  collections: 'Collections',
  kids: 'Kids',
};

// Series strips — the recognizable EN platforms (from SERIES_TABS 'platforms').
// Curated + EN-focused, same spirit as the movie side (French lives in Live).
const SERIES_STRIPS: { id: string; label: string; accent: string; categoryIds: string[] }[] = [
  { id: 'sr-netflix', label: 'Séries Netflix', accent: '#E50914', categoryIds: ['106', '171'] },
  { id: 'sr-prime',   label: 'Séries Prime',   accent: '#00A8E1', categoryIds: ['108'] },
  { id: 'sr-hbo',     label: 'HBO Max',        accent: '#A855F7', categoryIds: ['188'] },
  { id: 'sr-disney',  label: 'Disney+',        accent: '#3B82F6', categoryIds: ['654', '102'] },
  { id: 'sr-apple',   label: 'Apple TV+',      accent: '#D4D4D8', categoryIds: ['114'] },
  { id: 'sr-hollywood-tv', label: 'Hollywood TV', accent: '#F59E0B', categoryIds: ['225', '311', '206', '199', '308', '334'] },
];

/** Build the full wall: New Drops, the movie parents, then the series platforms. */
function buildShelves(): WallShelf[] {
  const shelves: WallShelf[] = [
    { id: 'new-drops', label: 'New Drops', accent: '#34D399', kind: 'movie', categoryIds: NEW_DROPS_CATEGORY_IDS, hot: true },
  ];
  for (const parentId of ['hollywood', 'netflix', 'collections', 'kids'] as const) {
    const categoryIds = parentCategoryIds(parentId);
    if (categoryIds.length === 0) continue;
    shelves.push({
      id: parentId,
      label: MOVIE_LABEL[parentId] ?? parentId,
      accent: MOVIE_ACCENT[parentId] ?? '#E8B04B',
      kind: 'movie',
      categoryIds,
    });
  }
  for (const s of SERIES_STRIPS) {
    shelves.push({ id: s.id, label: s.label, accent: s.accent, kind: 'series', categoryIds: s.categoryIds });
  }
  return shelves;
}

export const SHELVES: WallShelf[] = buildShelves();

/**
 * The vendor's line — the whole shop's scale. Not a live COUNT(*) (that would be
 * a per-render round-trip against 60k+ rows); the catalog sync's headline figure
 * (62.7k movies + 16.5k series) rounded to what the founder says out loud.
 */
export const CATALOG_TOTAL = 78000;
