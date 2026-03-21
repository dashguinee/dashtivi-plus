import { useState, useEffect } from 'react';
import { getItem, setItem } from '@/lib/storage';
import { getTmdbMap } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { WatchHistoryEntry, FavoriteEntry } from '@/types';

// ── Types ──────────────────────────────────────────────────────────

export interface UserProfile {
  genreScores: Record<number, number>; // genreId -> 0-1 affinity (normalized)
  recentGenres: number[];              // last 10 unique genre IDs
  favoriteGenres: number[];            // genres from favorited content
  timePreference: 'morning' | 'afternoon' | 'evening' | 'night';
  watchCount: number;
  lastWatched: { id: string; name: string; genres: number[] }[]; // last 5
}

// ── Constants ──────────────────────────────────────────────────────

const PROFILE_KEY = 'tivi_user_profile';
const PROFILE_TTL = 60 * 60 * 1000; // 1 hour

// Cold-start defaults: Action, Drama, Comedy, Thriller
const COLD_START_GENRES: Record<number, number> = {
  28: 0.6,  // Action
  18: 0.5,  // Drama
  35: 0.5,  // Comedy
  53: 0.4,  // Thriller
};

interface CachedProfile {
  profile: UserProfile;
  ts: number;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Extract stream ID and type from a channelId like "vod-12345" or "series-678"
 */
function parseChannelId(channelId: string): { type: 'movie' | 'series'; id: number } | null {
  const vodMatch = channelId.match(/^vod-(\d+)$/);
  if (vodMatch) return { type: 'movie', id: parseInt(vodMatch[1], 10) };

  const seriesMatch = channelId.match(/^series-(\d+)$/);
  if (seriesMatch) return { type: 'series', id: parseInt(seriesMatch[1], 10) };

  return null;
}

/**
 * Build the TMDB lookup key: "m:{streamId}" for movies, "s:{seriesId}" for series
 */
function tmdbKey(type: 'movie' | 'series', id: number): string {
  return type === 'movie' ? `m:${id}` : `s:${id}`;
}

/**
 * Determine time-of-day preference from watch timestamps
 */
function computeTimePreference(timestamps: number[]): UserProfile['timePreference'] {
  if (timestamps.length === 0) return 'evening';

  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const ts of timestamps) {
    const hour = new Date(ts).getHours();
    if (hour >= 6 && hour < 12) buckets.morning++;
    else if (hour >= 12 && hour < 18) buckets.afternoon++;
    else if (hour >= 18 && hour < 23) buckets.evening++;
    else buckets.night++;
  }

  let max: UserProfile['timePreference'] = 'evening';
  let maxCount = 0;
  for (const [period, count] of Object.entries(buckets)) {
    if (count > maxCount) {
      maxCount = count;
      max = period as UserProfile['timePreference'];
    }
  }
  return max;
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScores(scores: Record<number, number>): Record<number, number> {
  const values = Object.values(scores);
  if (values.length === 0) return scores;
  const max = Math.max(...values);
  if (max === 0) return scores;

  const normalized: Record<number, number> = {};
  for (const [genre, score] of Object.entries(scores)) {
    normalized[Number(genre)] = score / max;
  }
  return normalized;
}

// ── Core Builder ───────────────────────────────────────────────────

export async function buildUserProfile(
  history: WatchHistoryEntry[],
  favorites: FavoriteEntry[],
  tmdbMap: Record<string, TmdbEntry>
): Promise<UserProfile> {
  const genreScores: Record<number, number> = {};
  const recentGenresSet: number[] = [];
  const favoriteGenresSet = new Set<number>();
  const lastWatched: UserProfile['lastWatched'] = [];
  const timestamps: number[] = [];

  // Cold start: if < 3 watches, return defaults
  if (history.length < 3) {
    return {
      genreScores: COLD_START_GENRES,
      recentGenres: [28, 18, 35, 53],
      favoriteGenres: [],
      timePreference: 'evening',
      watchCount: history.length,
      lastWatched: [],
    };
  }

  // Sort history by recency (newest first)
  const sorted = [...history].sort((a, b) => b.watchedAt - a.watchedAt);

  // Recency weights: newest = 1.0, oldest = 0.2
  const count = sorted.length;
  const getWeight = (index: number): number => {
    if (count <= 1) return 1.0;
    return 1.0 - (index / (count - 1)) * 0.8; // 1.0 -> 0.2
  };

  // Process watch history
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const parsed = parseChannelId(entry.channelId);
    if (!parsed) continue;

    timestamps.push(entry.watchedAt);
    const key = tmdbKey(parsed.type, parsed.id);
    const tmdb = tmdbMap[key];
    const genres = tmdb?.g || [];
    const weight = getWeight(i);

    // Build last 5 watched items
    if (lastWatched.length < 5 && entry.name) {
      lastWatched.push({
        id: entry.channelId,
        name: entry.name,
        genres,
      });
    }

    // Accumulate genre scores with recency weighting
    for (const g of genres) {
      genreScores[g] = (genreScores[g] || 0) + weight;

      // Track recent unique genres (up to 10)
      if (!recentGenresSet.includes(g) && recentGenresSet.length < 10) {
        recentGenresSet.push(g);
      }
    }
  }

  // Favorites bonus: +0.5 on their genre scores
  const favoriteIds = new Set(favorites.map((f) => f.channelId));
  for (const entry of sorted) {
    if (!favoriteIds.has(entry.channelId)) continue;

    const parsed = parseChannelId(entry.channelId);
    if (!parsed) continue;

    const key = tmdbKey(parsed.type, parsed.id);
    const tmdb = tmdbMap[key];
    const genres = tmdb?.g || [];

    for (const g of genres) {
      genreScores[g] = (genreScores[g] || 0) + 0.5;
      favoriteGenresSet.add(g);
    }
  }

  return {
    genreScores: normalizeScores(genreScores),
    recentGenres: recentGenresSet,
    favoriteGenres: Array.from(favoriteGenresSet),
    timePreference: computeTimePreference(timestamps),
    watchCount: history.length,
    lastWatched,
  };
}

// ── React Hook ─────────────────────────────────────────────────────

export function useUserProfile(): { profile: UserProfile | null; loading: boolean } {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Check localStorage cache first
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) {
          const cached: CachedProfile = JSON.parse(raw);
          if (Date.now() - cached.ts < PROFILE_TTL) {
            if (mounted) {
              setProfile(cached.profile);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Cache miss or corrupt — rebuild
      }

      // TMDB chunk is preloaded during splash/login screen (preloader.ts)
      // No delay needed — just await the already-started import

      // Load dependencies
      const history: WatchHistoryEntry[] = getItem('watch_history', []);
      const favorites: FavoriteEntry[] = getItem('favorites', []);

      const tmdbData = await getTmdbMap();
      if (!tmdbData || !mounted) {
        if (mounted) setLoading(false);
        return;
      }

      const built = await buildUserProfile(history, favorites, tmdbData.TMDB_MAP);
      if (!mounted) return;

      // Cache result
      try {
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({ profile: built, ts: Date.now() } as CachedProfile)
        );
      } catch {
        // Storage full — proceed without caching
      }

      setProfile(built);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { profile, loading };
}
