/**
 * "Le Mur" — the cinema cover-wall shelves (v1).
 *
 * Three hard-coded shelves for the /wall preview surface. Each shelf resolves a
 * set of Xtream category IDs (fetched via getVodByCategory) into one horizontal
 * filmstrip you swipe-flip through. categoryIds are derived from the same source
 * of truth MoviesPage uses (MOVIE_TABS + NEW_DROPS_CATEGORY_IDS) so the wall never
 * drifts from the classic Movies page.
 */
import { MOVIE_TABS } from '@/lib/movie-collections';

export interface WallShelf {
  id: string;
  label: string;
  accent: string;
  categoryIds: string[];
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

export const SHELVES: WallShelf[] = [
  { id: 'new-drops', label: 'New Drops', accent: '#34D399', categoryIds: NEW_DROPS_CATEGORY_IDS },
  { id: 'hollywood', label: 'Hollywood', accent: '#E8B04B', categoryIds: parentCategoryIds('hollywood') },
  { id: 'netflix', label: 'Netflix', accent: '#E50914', categoryIds: parentCategoryIds('netflix') },
];
