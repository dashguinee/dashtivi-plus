/**
 * DashTivi+ Moment Packs — Lifestyle-based content curation
 *
 * Replaces generic genre rows with mood/context-based collections
 * that adapt to the viewer's time of day and emotional state.
 *
 * Each pack defines a filter against TMDB data (genres, rating, runtime)
 * and optional time windows when the pack is most relevant.
 */

import type { TmdbEntry } from '@/lib/tmdb-map.generated';

// ── Types ────────────────────────────────────────────────────────────

export interface MomentPack {
  id: string;
  nameKey: string;        // i18n translation key
  descKey: string;        // i18n description key
  icon: string;           // Lucide icon name
  filter: {
    genres: number[];     // TMDB genre IDs to match (ANY) — empty = all genres
    minRating: number;    // Minimum TMDB rating
    maxRuntime?: number;  // Max runtime in minutes (optional)
    minRuntime?: number;  // Min runtime (optional)
  };
  /** Time windows when this pack is featured (24h clock, local time) */
  timeWindows?: { start: number; end: number }[];
}

// ── TMDB Genre IDs ───────────────────────────────────────────────────
// 28=Action  12=Adventure  16=Animation  35=Comedy  80=Crime
// 99=Documentary  18=Drama  10751=Family  14=Fantasy  36=History
// 27=Horror  10402=Music  9648=Mystery  10749=Romance  878=Sci-Fi
// 53=Thriller  10752=War  37=Western

// ── Pack Definitions ─────────────────────────────────────────────────

export const MOMENT_PACKS: MomentPack[] = [
  {
    id: 'before-sleep',
    nameKey: 'momentBeforeSleep',
    descKey: 'momentDescBeforeSleep',
    icon: 'Moon',
    filter: {
      genres: [35, 18, 10749, 10751, 16],
      minRating: 6.5,
      maxRuntime: 120,
    },
    timeWindows: [{ start: 21, end: 4 }],
  },
  {
    id: 'everyone-watching',
    nameKey: 'momentEveryoneWatching',
    descKey: 'momentDescEveryoneWatching',
    icon: 'TrendingUp',
    filter: {
      genres: [],
      minRating: 8.0,
    },
    // Always available, but featured in evening
    timeWindows: [{ start: 18, end: 23 }],
  },
  {
    id: 'quick-lunch',
    nameKey: 'momentQuickLunch',
    descKey: 'momentDescQuickLunch',
    icon: 'Coffee',
    filter: {
      genres: [35, 28, 16],
      minRating: 6.0,
      maxRuntime: 100,
    },
    timeWindows: [{ start: 11, end: 14 }],
  },
  {
    id: 'late-night',
    nameKey: 'momentLateNight',
    descKey: 'momentDescLateNight',
    icon: 'Rabbit',
    filter: {
      genres: [53, 9648, 80, 27, 878],
      minRating: 7.0,
    },
    timeWindows: [{ start: 22, end: 5 }],
  },
  {
    id: 'in-your-feelings',
    nameKey: 'momentInYourFeelings',
    descKey: 'momentDescInYourFeelings',
    icon: 'Heart',
    filter: {
      genres: [18, 10749, 10752, 36],
      minRating: 7.5,
    },
    // Always available
  },
  {
    id: 'family-time',
    nameKey: 'momentFamilyTime',
    descKey: 'momentDescFamilyTime',
    icon: 'Users',
    filter: {
      genres: [16, 10751, 35, 12],
      minRating: 6.0,
      maxRuntime: 130,
    },
    timeWindows: [{ start: 14, end: 20 }],
  },
  {
    id: 'adrenaline',
    nameKey: 'momentAdrenaline',
    descKey: 'momentDescAdrenaline',
    icon: 'Zap',
    filter: {
      genres: [28, 12, 53, 10752],
      minRating: 6.5,
    },
    // Always available
  },
  {
    id: 'mind-benders',
    nameKey: 'momentMindBenders',
    descKey: 'momentDescMindBenders',
    icon: 'Brain',
    filter: {
      genres: [878, 9648, 14, 99],
      minRating: 7.5,
    },
    // Always available
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Check if a given hour falls within a time window.
 * Handles overnight windows (e.g. start=22, end=5 means 22:00-05:00).
 */
function isInTimeWindow(hour: number, window: { start: number; end: number }): boolean {
  if (window.start <= window.end) {
    // Normal range (e.g. 11-14)
    return hour >= window.start && hour < window.end;
  }
  // Overnight range (e.g. 22-5 means 22,23,0,1,2,3,4)
  return hour >= window.start || hour < window.end;
}

/**
 * Check if a pack is time-relevant right now.
 * Packs without timeWindows are always relevant.
 */
function isPackActiveAtHour(pack: MomentPack, hour: number): boolean {
  if (!pack.timeWindows || pack.timeWindows.length === 0) return true;
  return pack.timeWindows.some(w => isInTimeWindow(hour, w));
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Returns moment packs relevant to the given hour, sorted by relevance.
 * Time-matched packs come first, then always-on packs.
 */
export function getActiveMomentPacks(hour: number): MomentPack[] {
  const timeMatched: MomentPack[] = [];
  const alwaysOn: MomentPack[] = [];

  for (const pack of MOMENT_PACKS) {
    if (!pack.timeWindows || pack.timeWindows.length === 0) {
      // Always-on packs
      alwaysOn.push(pack);
    } else if (pack.timeWindows.some(w => isInTimeWindow(hour, w))) {
      // Time-matched packs — prioritized
      timeMatched.push(pack);
    }
    // Packs with time windows that don't match current hour are excluded
  }

  return [...timeMatched, ...alwaysOn];
}

/**
 * Returns all moment packs regardless of time (for UI that shows all packs).
 */
export function getAllMomentPacks(): MomentPack[] {
  return MOMENT_PACKS;
}

/**
 * Filters TMDB entries by a moment pack's criteria.
 * Returns stream ID keys (e.g. "m:12345") sorted by TMDB rating descending.
 */
export function filterByMomentPack(
  pack: MomentPack,
  tmdbMap: Record<string, TmdbEntry>
): string[] {
  const { genres, minRating, maxRuntime, minRuntime } = pack.filter;
  const hasGenreFilter = genres.length > 0;

  const results: { key: string; rating: number }[] = [];

  for (const [key, entry] of Object.entries(tmdbMap)) {
    // Rating gate
    if ((entry.r || 0) < minRating) continue;

    // Runtime gates
    if (maxRuntime !== undefined && (entry.t || 0) > maxRuntime && entry.t !== undefined) continue;
    if (minRuntime !== undefined && (entry.t || 0) < minRuntime) continue;

    // Genre gate — match ANY of the specified genres
    if (hasGenreFilter) {
      const entryGenres = entry.g || [];
      if (!entryGenres.some(g => genres.includes(g))) continue;
    }

    results.push({ key, rating: entry.r || 0 });
  }

  // Sort by rating descending
  results.sort((a, b) => b.rating - a.rating);

  return results.map(r => r.key);
}

/**
 * Quick utility: get a capped set of results for a pack (for display rows).
 * Returns at most `limit` stream IDs.
 */
export function getMomentPackResults(
  pack: MomentPack,
  tmdbMap: Record<string, TmdbEntry>,
  limit = 15
): string[] {
  return filterByMomentPack(pack, tmdbMap).slice(0, limit);
}
