/**
 * DASH TiVi+ — Recommendation & Tagging Layer
 * ============================================
 *
 * Pure data/logic. NO React, NO UI, NO network of its own — every builder takes the
 * already-loaded TMDB map (from `getTmdbMap()`) plus a candidate pool and returns
 * ranked rows that slot straight into the existing `VeeCollectionRow` + `PosterCard`
 * pipeline. Call these inside a `useMemo` exactly like the page already does for
 * `veeCollectionRows` / `momentRows`.
 *
 * The thesis (per the state-map): every signal a recommender needs already exists
 * client-side — 44.6k TMDB-tagged titles × watch/like/resume — they are simply never
 * joined. This module joins them.
 *
 * ── ID conventions discovered in the live code (load-bearing) ─────────────────────
 *   • Movie watch-history channelId  = `vod-<stream_id>`        → TMDB key `m:<id>`
 *   • Series watch-history channelId = `series-<EPISODE_id>`    → episode-keyed, NOT
 *       joinable to the `s:<series_id>` TMDB key. Series history therefore contributes
 *       to "Continue Watching" (which needs no TMDB join) but is skipped from genre
 *       affinity (its key won't resolve in TMDB_MAP — a miss, never a crash).
 *   • Like id  = `movie-<stream_id>` / `series-<series_id>`     → both join cleanly.
 *   • Recent  = `tivi_recent_movies` / `tivi_recent_series`     → arrays of VodStream/SeriesItem.
 *
 * ── Storage-key correction ────────────────────────────────────────────────────────
 *   The state-map's Part 5.1 sketch reads `localStorage.getItem('watch_history')` raw.
 *   That is WRONG: `useWatchHistory` writes through `storage.ts`, which prefixes `tivi_`,
 *   so the real key is `tivi_watch_history`. We read through the same `getItem` helper
 *   so we always read exactly what the app wrote.
 *
 * ── Bug fixes baked in (per Part 4) ───────────────────────────────────────────────
 *   #1  `t.y` is the YouTube trailer key, NOT a year. Year is parsed from the title:
 *       `name.match(/\((\d{4})\)/)` via `parseYearFromName`.
 *   #4  One unified trending formula (`trendScore`) — engagement-aware, falls back to
 *       rating+recency when no `tivi_playback_events` source is wired.
 *   #5  Top-10 styling is carried on an explicit `isTop10` flag, never array index.
 */

import type { VodStream, SeriesItem } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { WatchHistoryEntry } from '@/types';
import type { LikeEntry } from '@/lib/likes';
import type { DownloadEntry } from '@/lib/downloads';
import type { VeeMovieCollection } from '@/lib/movie-collections';
import type { VeeSeriesCollection } from '@/lib/series-collections';
import { getItem } from '@/lib/storage';
import { resumePosition, isInProgress } from '@/hooks/useWatchHistory';
import { MOMENT_PACKS, filterByMomentPack, type MomentPack } from '@/lib/moment-packs';
import { dailyShuffle } from '@/lib/intelligence';

// ─────────────────────────────────────────────────────────────────────────────────
// Core shared types
// ─────────────────────────────────────────────────────────────────────────────────

export type CatalogKind = 'movie' | 'series';

/** Either catalog row shape the pages already hold. */
export type AnyStream = VodStream | SeriesItem;

/** The render-item shape `VeeCollectionRow`/`PosterCard` already consume. */
export interface RecItem {
  id: number;
  name: string;
  poster: string;
  rating?: string;
  tmdbKey: string;
}

/** A ranked, labelled row. Convert to a synthetic VeeCollection (see converters
 *  below) to push into `veeRows`, or render `items` directly. */
export interface RankedRow {
  id: string;
  name: string;
  tagline: string;
  items: RecItem[];
  isTop10?: boolean;
  /** Where the row came from — useful for editorial ordering / debugging. */
  driver:
    | 'because-you-watched'
    | 'for-you'
    | 'trending'
    | 'genre'
    | 'mood'
    | 'gem-of-the-day'
    | 'dash-curated'
    | 'search-rerank'
    | 'from-favorites';
  /** For "Parce que vous avez regardé X" — the seed that produced the row. */
  seed?: SeedRef;
}

/** A title that seeded the affinity model (a like / a finished watch / a recent open). */
export interface SeedRef {
  tmdbKey: string;
  title: string;
  entry: TmdbEntry;
  weight: number;
  ts: number;
}

/** The member's per-device taste model, built from local signals. */
export interface Affinity {
  /** TMDB genre id → accumulated weight (liked ×3, watched ×2, recent ×1). */
  genreWeights: Map<number, number>;
  /** Distinct seed titles, ranked by weight then recency — drives "because you watched". */
  seeds: SeedRef[];
  /** Genre ids sorted by weight desc. */
  topGenres: number[];
  /** Distinct joined signals. < COLD_START_THRESHOLD ⇒ cold start (suppress personal rows). */
  signalCount: number;
}

/** Raw local signals. All optional readers go through the same `storage.ts` helper the
 *  app writes with, so keys/prefixes always line up. */
export interface RecSignals {
  history: WatchHistoryEntry[];
  likes: LikeEntry[];
  recentMovies: VodStream[];
  recentSeries: SeriesItem[];
  downloads: DownloadEntry[];
}

/** Optional engagement feed — wire this to aggregates from `tivi_playback_events`
 *  once telemetry lands. Each fn returns a normalized 0..1 score for a TMDB key. */
export interface EngagementSource {
  /** Recent view volume, normalized 0..1. */
  views7d?: (tmdbKey: string) => number;
  /** Average completion fraction, 0..1. */
  completionRate?: (tmdbKey: string) => number;
}

/** Member is "warmed up" once this many distinct signals have joined. */
export const COLD_START_THRESHOLD = 3;

// Weights — the state-map's prescribed model.
export const W_LIKE = 3;
export const W_WATCH = 2;
export const W_RECENT = 1;

// ─────────────────────────────────────────────────────────────────────────────────
// Stream adapters (abstract VodStream ⇄ SeriesItem on `kind`)
// ─────────────────────────────────────────────────────────────────────────────────

export function streamId(item: AnyStream, kind: CatalogKind): number {
  return kind === 'series' ? (item as SeriesItem).series_id : (item as VodStream).stream_id;
}

export function streamPoster(item: AnyStream, kind: CatalogKind): string {
  return kind === 'series' ? (item as SeriesItem).cover : (item as VodStream).stream_icon;
}

/** Unix-seconds recency stamp: VodStream.added / SeriesItem.last_modified. 0 if absent. */
export function streamAddedTs(item: AnyStream, kind: CatalogKind): number {
  const raw = kind === 'series' ? (item as SeriesItem).last_modified : (item as VodStream).added;
  const n = parseInt(raw || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function tmdbKeyOf(item: AnyStream, kind: CatalogKind): string {
  return `${kind === 'series' ? 's' : 'm'}:${streamId(item, kind)}`;
}

export function toRecItem(item: AnyStream, kind: CatalogKind): RecItem {
  const id = streamId(item, kind);
  return {
    id,
    name: item.name,
    poster: streamPoster(item, kind),
    rating: item.rating,
    tmdbKey: `${kind === 'series' ? 's' : 'm'}:${id}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Year parsing — the `t.y`-is-not-a-year fix (Part 4 #1)
// ─────────────────────────────────────────────────────────────────────────────────

/** Parse a release year from a catalog title like "Movie (2025)". 0 when absent.
 *  NEVER read `TmdbEntry.y` for a year — that field is the YouTube trailer key. */
export function parseYearFromName(name: string): number {
  const m = name.match(/\((\d{4})\)/);
  if (!m) return 0;
  const y = parseInt(m[1], 10);
  return y >= 1900 && y <= 2100 ? y : 0;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Signal readers + id → TMDB-key mappers
// ─────────────────────────────────────────────────────────────────────────────────

function readRecent<T>(unprefixedKey: string): T[] {
  // Pages write `tivi_recent_movies` / `tivi_recent_series` as the full key, which is
  // exactly what `getItem('recent_movies')` resolves to (storage.ts adds the `tivi_`).
  return getItem<T[]>(unprefixedKey, []);
}

/** Snapshot all local personalization signals. Cheap; safe to call inside a memo. */
export function readSignals(): RecSignals {
  return {
    history: getItem<WatchHistoryEntry[]>('watch_history', []),
    likes: getItem<LikeEntry[]>('likes', []),
    recentMovies: readRecent<VodStream>('recent_movies'),
    recentSeries: readRecent<SeriesItem>('recent_series'),
    downloads: getItem<DownloadEntry[]>('downloads', []),
  };
}

/** Map a watch-history channelId to its TMDB key, or null when un-joinable.
 *  Movies: `vod-<id>`/`movie-<id>` → `m:<id>`. Series history is episode-keyed → null. */
export function historyKeyToTmdb(channelId: string): string | null {
  if (channelId.startsWith('vod-')) return `m:${channelId.slice(4)}`;
  if (channelId.startsWith('movie-')) return `m:${channelId.slice(6)}`;
  // `series-<episodeId>` — episode id ≠ series id, cannot resolve the `s:` key.
  return null;
}

/** Map a like id (`movie-<stream_id>` / `series-<series_id>`) to its TMDB key. */
export function likeKeyToTmdb(id: string): string | null {
  if (id.startsWith('movie-')) return `m:${id.slice(6)}`;
  if (id.startsWith('series-')) return `s:${id.slice(7)}`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Affinity model
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Build the taste model from local signals + the TMDB map.
 * Likes weigh ×3, watched/finished history ×2, recent opens ×1.
 * Pass your own `signals` to keep it deterministic in tests; defaults to `readSignals()`.
 */
export function buildAffinity(
  tmdbMap: Record<string, TmdbEntry>,
  signals: RecSignals = readSignals(),
): Affinity {
  const genreWeights = new Map<number, number>();
  const seedMap = new Map<string, SeedRef>();

  const add = (key: string | null, weight: number, title: string, ts: number): void => {
    if (!key) return;
    const e = tmdbMap[key];
    if (!e) return;
    for (const g of e.g ?? []) genreWeights.set(g, (genreWeights.get(g) ?? 0) + weight);
    const prev = seedMap.get(key);
    seedMap.set(key, {
      tmdbKey: key,
      title: title || prev?.title || '',
      entry: e,
      weight: Math.max(weight, prev?.weight ?? 0),
      ts: Math.max(ts, prev?.ts ?? 0),
    });
  };

  for (const l of signals.likes) add(likeKeyToTmdb(l.id), W_LIKE, l.title, l.ts);
  for (const h of signals.history) {
    if (h.category === 'movie' || h.category === 'series') {
      add(historyKeyToTmdb(h.channelId), W_WATCH, h.name ?? '', h.watchedAt);
    }
  }
  for (const v of signals.recentMovies) add(`m:${v.stream_id}`, W_RECENT, v.name, 0);
  for (const s of signals.recentSeries) add(`s:${s.series_id}`, W_RECENT, s.name, 0);

  const topGenres = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const seeds = [...seedMap.values()].sort(
    (a, b) => b.weight - a.weight || b.ts - a.ts,
  );

  return { genreWeights, seeds, topGenres, signalCount: seedMap.size };
}

/** True when the member has too few signals for personalized rows (cold start). */
export function isColdStart(affinity: Affinity): boolean {
  return affinity.signalCount < COLD_START_THRESHOLD;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Scoring primitives
// ─────────────────────────────────────────────────────────────────────────────────

/** Genre-weighted affinity score, rating as a soft tiebreak. */
export function affinityScore(entry: TmdbEntry, genreWeights: Map<number, number>): number {
  let genre = 0;
  for (const g of entry.g ?? []) genre += genreWeights.get(g) ?? 0;
  return genre + (entry.r ?? 0) / 2;
}

/** "More like this" — genre overlap with a single seed, rating as tiebreak. */
export function simScore(seed: TmdbEntry, candidate: TmdbEntry): number {
  const seedGenres = seed.g ?? [];
  let overlap = 0;
  for (const g of candidate.g ?? []) if (seedGenres.includes(g)) overlap++;
  return overlap * 2 + (candidate.r ?? 0) / 2;
}

const CURRENT_YEAR = new Date().getFullYear();

/** Recency decay from release year → 0..1 (this year ≈ 1, ~half-life 4 years). */
export function recencyDecay(year: number): number {
  if (!year) return 0;
  const age = Math.max(0, CURRENT_YEAR - year);
  return Math.exp(-age / 6);
}

/**
 * THE unified trending score (kills the dual `getTrendingScore`/`byTrendingScore` drift,
 * Part 4 #4). Returns 0..1.
 *   trend = 0.45·rating + 0.25·recencyDecay(year) + 0.30·engagement
 * `engagement = views7d + completionRate` (each 0..1, clamped) — 0 until telemetry lands.
 */
export function trendScore(
  item: AnyStream,
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  engagement?: EngagementSource,
): number {
  const key = tmdbKeyOf(item, kind);
  const e = tmdbMap[key];
  const rating = (e?.r ?? 0) / 10;
  const year = parseYearFromName(item.name);
  const rec = recencyDecay(year);
  let eng = 0;
  if (engagement) {
    const v = engagement.views7d?.(key) ?? 0;
    const c = engagement.completionRate?.(key) ?? 0;
    eng = Math.min(1, Math.max(0, v) + Math.max(0, c));
  }
  return 0.45 * rating + 0.25 * rec + 0.3 * eng;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Generic ranker
// ─────────────────────────────────────────────────────────────────────────────────

export interface RankOpts {
  /** Max items kept. */
  limit: number;
  /** Drop a title unless its score clears this. Default 0 (keep anything with a TMDB hit). */
  minScore?: number;
  /** TMDB keys to exclude (already-seen, already-in-another-row, etc). */
  excludeKeys?: Set<string>;
  /** Require a TMDB entry to be considered. Default true. */
  requireTmdb?: boolean;
}

/**
 * Score a pool, drop excluded/sub-threshold titles, return top-`limit` RecItems.
 * `score(entry, item)` — `entry` is null only when `requireTmdb === false`.
 */
export function rankPool(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  score: (entry: TmdbEntry | null, item: AnyStream) => number,
  opts: RankOpts,
): RecItem[] {
  const { limit, minScore = 0, excludeKeys, requireTmdb = true } = opts;
  const scored: { item: AnyStream; key: string; s: number }[] = [];
  for (const item of pool) {
    const key = tmdbKeyOf(item, kind);
    if (excludeKeys?.has(key)) continue;
    const entry = tmdbMap[key] ?? null;
    if (requireTmdb && !entry) continue;
    const s = score(entry, item);
    if (s <= minScore) continue;
    scored.push({ item, key, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => toRecItem(x.item, kind));
}

// ─────────────────────────────────────────────────────────────────────────────────
// Row builders — the producers the pages call
// ─────────────────────────────────────────────────────────────────────────────────

/** Keys the member has already engaged with (likes + joinable watch history + recent). */
export function seenKeys(signals: RecSignals): Set<string> {
  const set = new Set<string>();
  for (const l of signals.likes) { const k = likeKeyToTmdb(l.id); if (k) set.add(k); }
  for (const h of signals.history) {
    if (h.category === 'movie' || h.category === 'series') {
      const k = historyKeyToTmdb(h.channelId); if (k) set.add(k);
    }
  }
  for (const v of signals.recentMovies) set.add(`m:${v.stream_id}`);
  for (const s of signals.recentSeries) set.add(`s:${s.series_id}`);
  return set;
}

export interface ForYouOpts {
  limit?: number;
  minItems?: number;
  /** Exclude titles the member already engaged with. Default true. */
  excludeSeen?: boolean;
}

/**
 * "Pour Vous" — replaces the recency-only For You row with a genre-affinity ranking.
 * Returns null below `minItems` so the page never renders an empty row.
 */
export function recommendFor(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: ForYouOpts = {},
  signals?: RecSignals,
): RankedRow | null {
  const { limit = 25, minItems = 4, excludeSeen = true } = opts;
  if (isColdStart(affinity)) return null;
  const exclude = excludeSeen ? seenKeys(signals ?? readSignals()) : undefined;
  const items = rankPool(
    pool, kind, tmdbMap,
    (e) => (e ? affinityScore(e, affinity.genreWeights) : 0),
    { limit, minScore: 0, excludeKeys: exclude },
  );
  if (items.length < minItems) return null;
  return { id: 'for-you', name: 'Pour Vous', tagline: 'Choisi pour vos goûts', items, driver: 'for-you' };
}

export interface BecauseOpts {
  /** How many "Parce que…" rows to emit. Default 2. */
  maxRows?: number;
  limit?: number;
  minItems?: number;
}

/**
 * "Parce que vous avez regardé X" — per top-seed `simScore`. Seeds come from the
 * affinity model (most-recent finished/liked first). Excludes the seed itself and
 * anything already seen. Emits up to `maxRows` rows, each titled with the real seed name.
 */
export function becauseYouWatched(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: BecauseOpts = {},
  signals?: RecSignals,
): RankedRow[] {
  const { maxRows = 2, limit = 20, minItems = 4 } = opts;
  if (affinity.seeds.length === 0) return [];
  const exclude = seenKeys(signals ?? readSignals());
  const rows: RankedRow[] = [];
  for (const seed of affinity.seeds) {
    if (rows.length >= maxRows) break;
    const items = rankPool(
      pool, kind, tmdbMap,
      (e) => (e ? simScore(seed.entry, e) : 0),
      { limit, minScore: 0, excludeKeys: new Set([...exclude, seed.tmdbKey]) },
    );
    if (items.length < minItems) continue;
    const label = seed.title ? `Parce que vous avez regardé ${cleanTitle(seed.title)}` : 'Dans la même veine';
    rows.push({
      id: `because-${seed.tmdbKey}`,
      name: label,
      tagline: 'Dans la même veine',
      items,
      driver: 'because-you-watched',
      seed,
    });
  }
  return rows;
}

export interface TrendingOpts {
  limit?: number;
  minItems?: number;
  isTop10?: boolean;
  engagement?: EngagementSource;
}

/** "Tendance maintenant" — the one unified trending row. */
export function trendingNow(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  opts: TrendingOpts = {},
): RankedRow | null {
  const { limit = 25, minItems = 4, isTop10 = false, engagement } = opts;
  const items = rankPool(
    pool, kind, tmdbMap,
    (_e, item) => trendScore(item, kind, tmdbMap, engagement),
    { limit, minScore: 0 },
  );
  if (items.length < minItems) return null;
  return {
    id: 'trending-now',
    name: 'Tendance maintenant',
    tagline: 'Ce que tout le monde regarde',
    items,
    isTop10,
    driver: 'trending',
  };
}

export interface GenreRowsOpts {
  /** How many genre rows to emit. Default 4. */
  maxRows?: number;
  limit?: number;
  minItems?: number;
  /** Genre id → display label (TMDB_GENRES / TMDB_TV_GENRES). */
  genreLabels: Record<number, string>;
  /** Optional flavour taglines per genre id. */
  taglines?: Record<number, string>;
}

/**
 * Auto genre/tag collections from the member's `topGenres`. Generated, not hand-typed —
 * once `tivi_collections` lands these become Supabase-authored. Each row is gated at
 * `minItems` so thin genres silently drop instead of rendering empty (Part 4 P2 fix).
 */
export function genreCollections(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: GenreRowsOpts,
): RankedRow[] {
  const { maxRows = 4, limit = 25, minItems = 4, genreLabels, taglines } = opts;
  const rows: RankedRow[] = [];
  const genres = affinity.topGenres.length > 0
    ? affinity.topGenres
    : [...mostCommonGenres(pool, kind, tmdbMap).keys()];

  for (const g of genres) {
    if (rows.length >= maxRows) break;
    const label = genreLabels[g];
    if (!label) continue;
    const items = rankPool(
      pool, kind, tmdbMap,
      (e, item) => ((e?.g ?? []).includes(g) ? trendScore(item, kind, tmdbMap) + 1 : -1),
      { limit, minScore: 0 },
    );
    if (items.length < minItems) continue;
    rows.push({
      id: `genre-${g}`,
      name: label,
      tagline: taglines?.[g] ?? `Le meilleur en ${label}`,
      items,
      driver: 'genre',
    });
  }
  return rows;
}

export interface MoodRowsOpts {
  maxRows?: number;
  limit?: number;
  minItems?: number;
  /** De-clock-gate: when true, ignore time windows entirely (default true). */
  ignoreTimeWindows?: boolean;
  /** Pack id → display label/tagline (UI owns i18n; defaults fall back to nameKey). */
  packLabels?: Record<string, { name: string; tagline: string }>;
}

/**
 * "Selon votre humeur" — moment/mood rows, de-clock-gated and ordered by member affinity
 * rather than `getHours()` (Part 4 P2 fix). Packs are resolved against the FULL TMDB map
 * (via `filterByMomentPack`) then intersected with the loaded pool, so a mood is never
 * silently constrained to one subtab.
 */
export function moodRows(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: MoodRowsOpts = {},
): RankedRow[] {
  const { maxRows = 3, limit = 20, minItems = 4, ignoreTimeWindows = true, packLabels } = opts;

  // Map of pool TMDB keys for O(1) intersection.
  const poolByKey = new Map<string, AnyStream>();
  for (const item of pool) poolByKey.set(tmdbKeyOf(item, kind), item);

  // Order packs by how well their genres match the member's affinity.
  const packs = [...MOMENT_PACKS]
    .filter((p) => ignoreTimeWindows || isPackActiveNow(p))
    .map((p) => ({ pack: p, score: packAffinity(p, affinity) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.pack);

  const rows: RankedRow[] = [];
  for (const pack of packs) {
    if (rows.length >= maxRows) break;
    const keys = filterByMomentPack(pack, tmdbMap); // rating-sorted, full-catalog
    const items: RecItem[] = [];
    for (const key of keys) {
      const item = poolByKey.get(key);
      if (item) items.push(toRecItem(item, kind));
      if (items.length >= limit) break;
    }
    if (items.length < minItems) continue;
    const label = packLabels?.[pack.id];
    rows.push({
      id: `mood-${pack.id}`,
      name: label?.name ?? pack.nameKey,
      tagline: label?.tagline ?? pack.descKey,
      items,
      driver: 'mood',
    });
  }
  return rows;
}

export interface GemOpts {
  limit?: number;
  minItems?: number;
  /** Min TMDB rating to qualify as a gem. Default 7.5. */
  minRating?: number;
  /** Max genre tags — "low popularity" proxy. Default 3. */
  maxGenres?: number;
  /** Salt for the daily seed so movies/series gems differ. */
  salt?: string;
}

/**
 * "La Pépite du Jour" — hidden-gems: high rating × low popularity, `dailyShuffle`d so it
 * is stable within a day and surprising across days. Reads year from the name, never `t.y`.
 */
export function hiddenGems(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  opts: GemOpts = {},
): RankedRow | null {
  const { limit = 20, minItems = 4, minRating = 7.5, maxGenres = 3, salt = kind } = opts;
  const candidates = pool.filter((item) => {
    const e = tmdbMap[tmdbKeyOf(item, kind)];
    if (!e || (e.r ?? 0) < minRating) return false;
    const sparse = (e.g ?? []).length < maxGenres;
    const noTrailer = !e.y; // no trailer key ⇒ less surfaced
    return sparse || noTrailer;
  });
  if (candidates.length < minItems) return null;
  const shuffled = dailyShuffle(candidates, salt);
  const items = shuffled.slice(0, limit).map((item) => toRecItem(item, kind));
  return {
    id: 'gem-of-the-day',
    name: 'La Pépite du Jour',
    tagline: 'Des trésors que peu ont vus',
    items,
    driver: 'gem-of-the-day',
  };
}

export interface CuratedOpts {
  limit?: number;
  minItems?: number;
  /** Set of stream/series ids flagged `is_gem` on the DB row (caller supplies — it isn't
   *  carried on VodStream/SeriesItem). When omitted, falls back to high-rating titles. */
  gemSet?: Set<number>;
  /** Rating floor for the fallback path. Default 8.0. */
  fallbackMinRating?: number;
}

/**
 * "Pépites DASH" — promote the existing `is_gem` curation moat (today only a hidden DB
 * sort) into a first-class labelled row. Pass `gemSet` from the DB rows; without it we
 * fall back to a high-rating cut so the row still renders.
 */
export function dashCurated(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  opts: CuratedOpts = {},
): RankedRow | null {
  const { limit = 25, minItems = 4, gemSet, fallbackMinRating = 8.0 } = opts;
  const pick = pool.filter((item) => {
    if (gemSet) return gemSet.has(streamId(item, kind));
    const e = tmdbMap[tmdbKeyOf(item, kind)];
    return !!e && (e.r ?? 0) >= fallbackMinRating;
  });
  if (pick.length < minItems) return null;
  const items = rankPool(
    pick, kind, tmdbMap,
    (_e, item) => trendScore(item, kind, tmdbMap),
    { limit, minScore: 0, requireTmdb: false },
  );
  if (items.length < minItems) return null;
  return {
    id: 'dash-curated',
    name: 'Pépites DASH',
    tagline: 'Triées sur le volet par DASH',
    items,
    driver: 'dash-curated',
  };
}

/**
 * "D'après vos favoris" — `simScore` seeded purely from likes (the Biblio→discovery
 * bridge). Distinct from `becauseYouWatched`, which also seeds from history.
 */
export function fromFavorites(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  opts: { limit?: number; minItems?: number } = {},
  signals?: RecSignals,
): RankedRow | null {
  const { limit = 25, minItems = 4 } = opts;
  const sig = signals ?? readSignals();
  // Build a like-only genre seed.
  const likeWeights = new Map<number, number>();
  const exclude = new Set<string>();
  for (const l of sig.likes) {
    const key = likeKeyToTmdb(l.id);
    if (!key) continue;
    exclude.add(key);
    const e = tmdbMap[key];
    if (!e) continue;
    for (const g of e.g ?? []) likeWeights.set(g, (likeWeights.get(g) ?? 0) + 1);
  }
  if (likeWeights.size === 0) return null;
  const items = rankPool(
    pool, kind, tmdbMap,
    (e) => (e ? affinityScore(e, likeWeights) : 0),
    { limit, minScore: 0, excludeKeys: exclude },
  );
  if (items.length < minItems) return null;
  return {
    id: 'from-favorites',
    name: "D'après vos favoris",
    tagline: 'Inspiré de ce que vous aimez',
    items,
    driver: 'from-favorites',
  };
}

/**
 * Search context strip — "Recommandé pour cette recherche": re-rank a result set by
 * affinity so search keeps a curated strip instead of collapsing to a bare grid
 * (Part 4 / design §4). Falls back to plain trend order on cold start.
 */
export function searchRerank(
  results: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: { limit?: number; minItems?: number } = {},
): RankedRow | null {
  const { limit = 20, minItems = 4 } = opts;
  const cold = isColdStart(affinity);
  const items = rankPool(
    results, kind, tmdbMap,
    (e, item) =>
      cold
        ? trendScore(item, kind, tmdbMap)
        : (e ? affinityScore(e, affinity.genreWeights) : 0),
    { limit, minScore: 0, requireTmdb: false },
  );
  if (items.length < minItems) return null;
  return {
    id: 'search-rerank',
    name: 'Recommandé pour cette recherche',
    tagline: 'Réordonné selon vos goûts',
    items,
    driver: 'search-rerank',
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Continue Watching (already-built logic; just surface it)
// ─────────────────────────────────────────────────────────────────────────────────

export interface ResumeRef {
  entry: WatchHistoryEntry;
  /** Seconds to seek to on play. */
  resumeFrom: number;
  /** Movie stream_id when joinable (series episodes aren't catalog-joinable). */
  streamId: number | null;
  kind: CatalogKind | null;
}

/**
 * "Reprendre" / Continue Watching — in-progress titles, newest first (history is stored
 * newest-first). `resumeFrom` is the seek offset. Movie entries expose `streamId` so the
 * page can deep-link; series entries are episode-keyed (resolve next episode via
 * SeriesExplorer at render time — owned elsewhere).
 */
export function continueWatching(signals: RecSignals = readSignals()): ResumeRef[] {
  return signals.history.filter(isInProgress).map((entry) => {
    const tk = historyKeyToTmdb(entry.channelId);
    return {
      entry,
      resumeFrom: resumePosition(entry),
      streamId: tk?.startsWith('m:') ? parseInt(tk.slice(2), 10) : null,
      kind: entry.category === 'series' ? 'series' : entry.category === 'movie' ? 'movie' : null,
    };
  });
}

// Re-export the canonical resume primitives so consumers import one module.
export { resumePosition, isInProgress } from '@/hooks/useWatchHistory';

// ─────────────────────────────────────────────────────────────────────────────────
// Hero resolver (3-tier priority)
// ─────────────────────────────────────────────────────────────────────────────────

export type HeroTier = 'resume' | 'affinity' | 'editorial';

export interface HeroPick {
  tier: HeroTier;
  item: AnyStream;
  entry: TmdbEntry | null;
  /** Seconds to seek to — only set on the resume tier. */
  resumeFrom?: number;
  /** Top candidates of the firing tier (for soft 8s rotation). First === `item`. */
  candidates: AnyStream[];
}

/**
 * Resolve the hero billboard top-down, first match wins (design §2):
 *   T1 Resume  → most-recent in-progress title present in `pool`
 *   T2 Affinity→ highest-affinity unseen title (needs ≥ COLD_START signals)
 *   T3 Editorial→ rotating high-trend title (cold start / no match)
 * Returns null only when the pool is empty.
 */
export function heroResolver(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
  affinity: Affinity,
  opts: { candidateCount?: number; engagement?: EngagementSource } = {},
  signals?: RecSignals,
): HeroPick | null {
  if (pool.length === 0) return null;
  const { candidateCount = 3, engagement } = opts;
  const sig = signals ?? readSignals();
  const byKey = new Map<string, AnyStream>();
  for (const item of pool) byKey.set(tmdbKeyOf(item, kind), item);

  // T1 — Resume (movies are catalog-joinable; series episodes aren't).
  const resumes = continueWatching(sig);
  for (const r of resumes) {
    if (r.streamId == null) continue;
    const item = byKey.get(`m:${r.streamId}`);
    if (item) {
      return {
        tier: 'resume',
        item,
        entry: tmdbMap[`m:${r.streamId}`] ?? null,
        resumeFrom: r.resumeFrom,
        candidates: [item],
      };
    }
  }

  // T2 — Affinity pick (unseen, member warmed up).
  if (!isColdStart(affinity)) {
    const exclude = seenKeys(sig);
    const ranked = rankPool(
      pool, kind, tmdbMap,
      (e) => (e ? affinityScore(e, affinity.genreWeights) : 0),
      { limit: candidateCount, minScore: 0, excludeKeys: exclude },
    );
    const candidates = resolveRecItems(ranked, byKey);
    if (candidates.length > 0) {
      return {
        tier: 'affinity',
        item: candidates[0],
        entry: tmdbMap[tmdbKeyOf(candidates[0], kind)] ?? null,
        candidates,
      };
    }
  }

  // T3 — Editorial (high trend, rotating).
  const ranked = rankPool(
    pool, kind, tmdbMap,
    (_e, item) => trendScore(item, kind, tmdbMap, engagement),
    { limit: candidateCount, minScore: 0, requireTmdb: false },
  );
  const candidates = resolveRecItems(ranked, byKey);
  const list = candidates.length > 0 ? candidates : pool.slice(0, candidateCount);
  return {
    tier: 'editorial',
    item: list[0],
    entry: tmdbMap[tmdbKeyOf(list[0], kind)] ?? null,
    candidates: list,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Synthetic VeeCollection converters — slot a RankedRow into the existing veeRows
// pipeline with ZERO new UI. `filter` checks membership in the precomputed id-set and
// `sort` preserves the row's rank order.
// ─────────────────────────────────────────────────────────────────────────────────

export function toMovieCollection(row: RankedRow): VeeMovieCollection {
  const rank = new Map<number, number>();
  row.items.forEach((it, i) => rank.set(it.id, i));
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    filter: (m) => rank.has(m.stream_id),
    sort: (a, b) => (rank.get(a.stream_id) ?? Infinity) - (rank.get(b.stream_id) ?? Infinity),
    limit: row.items.length,
    isTop10: row.isTop10,
  };
}

export function toSeriesCollection(row: RankedRow): VeeSeriesCollection {
  const rank = new Map<number, number>();
  row.items.forEach((it, i) => rank.set(it.id, i));
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    filter: (s) => rank.has(s.series_id),
    sort: (a, b) => (rank.get(a.series_id) ?? Infinity) - (rank.get(b.series_id) ?? Infinity),
    limit: row.items.length,
    isTop10: row.isTop10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────────

/** Strip a trailing "(2024)" and quality suffixes for clean row titles. */
function cleanTitle(name: string): string {
  return name.replace(/\s*\((\d{4})\)\s*$/, '').replace(/\s*[-–]\s*(4K|FHD|HD|SD)\b.*$/i, '').trim();
}

/** Count genre occurrences across a pool, ordered by frequency desc. */
function mostCommonGenres(
  pool: AnyStream[],
  kind: CatalogKind,
  tmdbMap: Record<string, TmdbEntry>,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of pool) {
    const e = tmdbMap[tmdbKeyOf(item, kind)];
    if (!e) continue;
    for (const g of e.g ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

/** How well a moment pack's genres line up with the member's affinity. */
function packAffinity(pack: MomentPack, affinity: Affinity): number {
  const genres = pack.filter.genres;
  if (genres.length === 0) return 0.01; // always-on, lowest priority among matched
  let s = 0;
  for (const g of genres) s += affinity.genreWeights.get(g) ?? 0;
  return s;
}

/** Is a moment pack within its time window right now? (used only when not de-gated). */
function isPackActiveNow(pack: MomentPack): boolean {
  if (!pack.timeWindows || pack.timeWindows.length === 0) return true;
  const hour = new Date().getHours();
  return pack.timeWindows.some((w) =>
    w.start <= w.end ? hour >= w.start && hour < w.end : hour >= w.start || hour < w.end,
  );
}

/** Map ranked RecItems back to their source streams (preserving order). */
function resolveRecItems(items: RecItem[], byKey: Map<string, AnyStream>): AnyStream[] {
  const out: AnyStream[] = [];
  for (const it of items) {
    const s = byKey.get(it.tmdbKey);
    if (s) out.push(s);
  }
  return out;
}
