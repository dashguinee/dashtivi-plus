/**
 * "Le Mur" — the cinema cover-wall shelves (v2).
 *
 * The full binder set: every MOVIE_TABS parent becomes one horizontal filmstrip
 * you flip through, plus a bespoke "New Drops" shelf at the top. Each shelf
 * resolves a set of Xtream category IDs (paged lazily via getVodByCategory) into
 * one endless strip of covers. categoryIds are derived from the same source of
 * truth MoviesPage uses (MOVIE_TABS + NEW_DROPS_CATEGORY_IDS) so the wall never
 * drifts from the classic Movies page.
 *
 * v2 vs v1: no longer three hard-coded shelves — we walk ALL MOVIE_TABS parents
 * so the wall is the whole shop, not a preview.
 */
import { MOVIE_TABS } from '@/lib/movie-collections';

export interface WallShelf {
  id: string;
  label: string;
  accent: string;
  categoryIds: string[];
  /** Vendor's "🔥 Ce soir" accent — the freshest strip, flagged for the eye. */
  hot?: boolean;
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

// Per-parent accent — each strip owns a colour so the vendor's eye reads depth.
const PARENT_ACCENT: Record<string, string> = {
  hollywood: '#E8B04B',   // candle gold
  netflix: '#E50914',     // Netflix red
  collections: '#9D4EDD',  // franchise violet
  kids: '#38BDF8',        // playful sky
};

const PARENT_LABEL: Record<string, string> = {
  hollywood: 'Hollywood',
  netflix: 'Netflix',
  collections: 'Collections',
  kids: 'Kids',
};

/** Build the full shelf set: New Drops first, then each MOVIE_TABS parent strip. */
function buildShelves(): WallShelf[] {
  const shelves: WallShelf[] = [
    { id: 'new-drops', label: 'New Drops', accent: '#34D399', categoryIds: NEW_DROPS_CATEGORY_IDS, hot: true },
  ];
  for (const parentId of ['hollywood', 'netflix', 'collections', 'kids'] as const) {
    const categoryIds = parentCategoryIds(parentId);
    if (categoryIds.length === 0) continue;
    shelves.push({
      id: parentId,
      label: PARENT_LABEL[parentId] ?? parentId,
      accent: PARENT_ACCENT[parentId] ?? '#E8B04B',
      categoryIds,
    });
  }
  return shelves;
}

export const SHELVES: WallShelf[] = buildShelves();

/**
 * The vendor's line — the whole shop's scale. Not a live COUNT(*) (that would be
 * a per-render round-trip against 60k+ rows); it's the founder's own number from
 * the catalog sync (62.7k movies) rounded to the headline he says out loud.
 */
export const CATALOG_TOTAL = 62000;
