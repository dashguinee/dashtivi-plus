/**
 * DashTivi+ Intelligence Layer
 *
 * 1. Smart collection ordering — sections reorder based on user behavior
 * 2. Content freshness — shuffles within collections each visit
 * 3. Theme affinity — tracks which Live TV themes user gravitates to
 */

import { getItem, setItem } from './storage';
import type { WatchHistoryEntry } from '@/types';

// ── Theme Affinity Tracker ──────────────────────────────────────

const AFFINITY_KEY = 'tivi_theme_affinity';

interface ThemeAffinity {
  [themeId: string]: {
    watches: number;      // total channel plays from this theme
    lastWatch: number;    // timestamp of last watch
    totalDuration: number; // total seconds watched
  };
}

export function getThemeAffinity(): ThemeAffinity {
  return getItem(AFFINITY_KEY, {});
}

export function recordThemeWatch(themeId: string, duration: number = 0) {
  const affinity = getThemeAffinity();
  const existing = affinity[themeId] || { watches: 0, lastWatch: 0, totalDuration: 0 };
  affinity[themeId] = {
    watches: existing.watches + 1,
    lastWatch: Date.now(),
    totalDuration: existing.totalDuration + duration,
  };
  setItem(AFFINITY_KEY, affinity);
}

// Map channel category IDs to theme IDs
const CATEGORY_TO_THEME: Record<string, string> = {
  // Sports
  '234': 'sports', '85': 'sports', '353': 'sports', '578': 'sports',
  '5': 'sports', '6': 'sports', '342': 'sports', '550': 'sports',
  '138': 'sports', '212': 'sports', '356': 'sports', '156': 'sports',
  '137': 'sports', '516': 'sports', '483': 'sports', '139': 'sports',
  '492': 'sports', '773': 'sports', '726': 'sports', '328': 'sports',
  // Entertainment
  '3': 'entertainment', '2': 'entertainment', '247': 'entertainment',
  '19': 'entertainment', '414': 'entertainment', '338': 'entertainment', '24': 'entertainment',
  // News
  '82': 'news', '417': 'news', '165': 'news', '730': 'news', '77': 'news', '98': 'news',
  // Kids
  '32': 'kids', '410': 'kids',
  // Cinema 24/7
  '275': 'movies247', '57': 'movies247', '282': 'movies247', '87': 'movies247',
  '280': 'movies247', '339': 'movies247', '340': 'movies247',
  // Music
  '416': 'music', '341': 'music', '555': 'music', '270': 'music', '287': 'music',
  // Discovery
  '337': 'documentary', '415': 'documentary',
  // Faith
  '123': 'faith', '561': 'faith',
};

export function getThemeForCategory(categoryId: string): string | null {
  return CATEGORY_TO_THEME[categoryId] || null;
}

// ── Smart Collection Ordering ───────────────────────────────────

/**
 * Reorders theme IDs based on user affinity.
 * Most-watched themes bubble to the top.
 * Themes never watched stay at the bottom in default order.
 */
export function getSmartThemeOrder(defaultOrder: string[]): string[] {
  const affinity = getThemeAffinity();
  const now = Date.now();
  const DAY = 86400000;

  // Score each theme
  const scored = defaultOrder.map(themeId => {
    const a = affinity[themeId];
    if (!a || a.watches === 0) return { themeId, score: 0 };

    // Recency boost: watched today = 1.0, yesterday = 0.7, this week = 0.4, older = 0.2
    const age = now - a.lastWatch;
    const recency = age < DAY ? 1.0 : age < 2 * DAY ? 0.7 : age < 7 * DAY ? 0.4 : 0.2;

    // Frequency: log scale, capped
    const frequency = Math.min(Math.log10(a.watches + 1) / 2, 1);

    // Duration: average watch time > 5min = engaged
    const avgDuration = a.totalDuration / a.watches;
    const engagement = Math.min(avgDuration / 300, 1); // 5 min = 1.0

    return { themeId, score: recency * 0.4 + frequency * 0.35 + engagement * 0.25 };
  });

  // Sort: scored themes first (by score desc), then unscored in original order
  const withScore = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  const withoutScore = scored.filter(s => s.score === 0);

  return [...withScore.map(s => s.themeId), ...withoutScore.map(s => s.themeId)];
}

// ── Content Freshness Rotation ──────────────────────────────────

/**
 * Seeded shuffle — deterministic per session but different each day.
 * Uses date as seed so content rotates daily but stays consistent within a session.
 */
export function dailyShuffle<T>(items: T[], salt: string = ''): T[] {
  if (items.length <= 1) return items;

  // Seed from today's date + salt
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  const seedStr = today + salt;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  }

  // Fisher-Yates with seeded random
  const result = [...items];
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Smart sort: keeps top-rated items at front, shuffles the middle,
 * so user sees quality content first but with variety each day.
 */
export function smartRotate<T>(
  items: T[],
  getScore: (item: T) => number,
  salt: string = '',
  topCount: number = 3
): T[] {
  if (items.length <= topCount) return items;

  // Pin top N by score (always show best first)
  const scored = items.map((item, i) => ({ item, score: getScore(item), index: i }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topCount).map(s => s.item);
  const rest = scored.slice(topCount).map(s => s.item);

  // Shuffle the rest daily
  return [...top, ...dailyShuffle(rest, salt)];
}

// ── Derive theme from watch history ─────────────────────────────

export function inferThemeFromHistory(history: WatchHistoryEntry[]): string | null {
  if (history.length === 0) return null;

  // Count theme occurrences in recent history
  const themeCounts: Record<string, number> = {};
  for (const entry of history.slice(0, 20)) {
    // Try to infer theme from channel category
    const category = entry.category;
    if (category === 'live') {
      // For live channels, use the channel name to guess theme
      const nl = (entry.name || '').toLowerCase();
      if (['sport', 'espn', 'bein', 'sky sport', 'football', 'nba', 'cricket'].some(k => nl.includes(k))) {
        themeCounts['sports'] = (themeCounts['sports'] || 0) + 1;
      } else if (['news', 'cnn', 'bbc news', 'al jazeera'].some(k => nl.includes(k))) {
        themeCounts['news'] = (themeCounts['news'] || 0) + 1;
      } else if (['nick', 'cartoon', 'disney', 'kids'].some(k => nl.includes(k))) {
        themeCounts['kids'] = (themeCounts['kids'] || 0) + 1;
      } else if (['mtv', 'music', 'vh1'].some(k => nl.includes(k))) {
        themeCounts['music'] = (themeCounts['music'] || 0) + 1;
      } else if (['discovery', 'nat geo', 'history', 'animal'].some(k => nl.includes(k))) {
        themeCounts['documentary'] = (themeCounts['documentary'] || 0) + 1;
      } else {
        themeCounts['entertainment'] = (themeCounts['entertainment'] || 0) + 1;
      }
    } else if (category === 'movie') {
      themeCounts['movies247'] = (themeCounts['movies247'] || 0) + 1;
    }
  }

  // Return most-watched theme
  const sorted = Object.entries(themeCounts).sort(([, a], [, b]) => b - a);
  return sorted.length > 0 ? sorted[0][0] : null;
}
