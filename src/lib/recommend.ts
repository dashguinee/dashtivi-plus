/**
 * DashTivi+ Recommendation Engine
 *
 * Scoring formula (all factors normalized 0-1, then weighted):
 *   Genre Match  40% — how well item genres align with user taste
 *   TMDB Rating  20% — quality signal from TMDB vote_average
 *   Freshness    20% — newer content scores higher
 *   Popularity   10% — log-scaled vote_count
 *   Diversity    10% — rewards unexplored genres
 */

import type { TmdbEntry } from './tmdb-map.generated';
import type { UserProfile } from '../hooks/useUserProfile';

// ── Helpers ────────────────────────────────────────────────────────

const YEAR_RE = /^(.+?)\s*\((\d{4})\)\s*$/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseYear(name: string): string | null {
  const m = name.match(YEAR_RE);
  return m ? m[2] : null;
}

function freshnessScore(year: string | null): number {
  if (!year) return 0.3;
  const y = parseInt(year, 10);
  const current = new Date().getFullYear();
  const diff = current - y;
  if (diff <= 0) return 1.0;
  if (diff === 1) return 0.8;
  if (diff === 2) return 0.6;
  if (diff === 3) return 0.4;
  return 0.2;
}

// ── Score a single content item ────────────────────────────────────

export function scoreContent(
  streamId: number,
  type: 'movie' | 'series',
  year: string | null,
  profile: UserProfile,
  tmdbMap: Record<string, TmdbEntry>
): number {
  const key = type === 'movie' ? `m:${streamId}` : `s:${streamId}`;
  const tmdb = tmdbMap[key];

  // Genre match (40%)
  const genres = tmdb?.g || [];
  let genreMatch = 0;
  if (genres.length > 0) {
    let sum = 0;
    for (const g of genres) {
      sum += profile.genreScores[g] || 0;
    }
    genreMatch = sum / genres.length;
  }

  // TMDB rating (20%) — 5.0 maps to 0, 9.0 maps to 1
  const ratingScore = tmdb ? clamp((tmdb.r - 5) / 4, 0, 1) : 0.3;

  // Freshness (20%)
  // Prefer TMDB year if no year extracted from title
  const freshness = freshnessScore(year);

  // Popularity (10%) — log10(vote_count) / 5
  const popularityScore = tmdb ? clamp(Math.log10(Math.max(tmdb.v, 1)) / 5, 0, 1) : 0.1;

  // Diversity (10%) — rewards unexplored genres
  const diversityScore = 1 - genreMatch;

  // Weighted sum
  return (
    genreMatch * 0.4 +
    ratingScore * 0.2 +
    freshness * 0.2 +
    popularityScore * 0.1 +
    diversityScore * 0.1
  );
}

// ── Get top N scored items from a mixed pool ───────────────────────

export function getForYouItems<T extends { stream_id?: number; series_id?: number; name: string }>(
  items: T[],
  type: 'movie' | 'series',
  profile: UserProfile,
  tmdbMap: Record<string, TmdbEntry>,
  limit: number
): T[] {
  const scored = items.map((item) => {
    const id = type === 'movie' ? item.stream_id : item.series_id;
    if (!id) return { item, score: 0 };

    const year = parseYear(item.name);
    const score = scoreContent(id, type, year, profile, tmdbMap);
    return { item, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

// ── Get items similar to a recently watched item ───────────────────

export function getBecauseYouWatched<T extends { stream_id?: number; series_id?: number; name: string }>(
  watchedGenres: number[],
  watchedName: string,
  allItems: T[],
  type: 'movie' | 'series',
  tmdbMap: Record<string, TmdbEntry>,
  limit: number
): T[] {
  if (watchedGenres.length === 0) return [];

  const watchedGenreSet = new Set(watchedGenres);

  // Score each item by genre overlap with the watched item
  const scored = allItems
    .filter((item) => {
      // Exclude the watched item itself
      return item.name !== watchedName;
    })
    .map((item) => {
      const id = type === 'movie' ? item.stream_id : item.series_id;
      if (!id) return { item, score: 0 };

      const key = type === 'movie' ? `m:${id}` : `s:${id}`;
      const tmdb = tmdbMap[key];
      const genres = tmdb?.g || [];

      // Genre overlap score
      let overlap = 0;
      for (const g of genres) {
        if (watchedGenreSet.has(g)) overlap++;
      }
      const genreScore = genres.length > 0 ? overlap / genres.length : 0;

      // Bonus for TMDB quality
      const ratingBonus = tmdb ? clamp((tmdb.r - 5) / 4, 0, 1) * 0.2 : 0;

      return { item, score: genreScore + ratingBonus };
    });

  // Sort by similarity score descending
  scored.sort((a, b) => b.score - a.score);

  // Only return items with some genre overlap
  return scored
    .filter((s) => s.score > 0.1)
    .slice(0, limit)
    .map((s) => s.item);
}
