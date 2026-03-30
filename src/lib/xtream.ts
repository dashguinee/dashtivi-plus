const STREAM_BASE = (import.meta.env.VITE_XTREAM_STREAM || 'http://datahub11.com:80').trim();
const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 10000; // 10s timeout for API calls

/**
 * Sanitize any image URL from Xtream API — handles dead domains, HTTP→proxy, blocked hosts.
 * Returns HTTPS URL safe for browser rendering, or null if unsalvageable.
 */
export function safeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  // Fix common URL corruption
  let u = url.replace(/^ttps:/, 'https:').replace(/"$/, '');
  // Replace dead starshare domain
  u = u.replace('starshare.live:8080', 'datahub11.com:8080');
  // Block known junk hosts
  if (u.includes('webhop.live') || u.includes('imdb.com') || u.includes('wikia.nocookie.net') || u.includes('paste.pics') || u.includes('tensports.com.pk')) {
    return null;
  }
  // Already HTTPS — safe
  if (u.startsWith('https://')) return u;
  // HTTP — proxy through VPS
  if (u.startsWith('http://')) return `${PROXY}/?url=${encodeURIComponent(u)}`;
  return null;
}

export interface XtreamCredentials {
  username: string;
  password: string;
}

export interface LiveCategory {
  category_id: string;
  category_name: string;
}

export interface LiveStream {
  stream_id: number;
  name: string;
  stream_icon: string;
  epg_channel_id: string;
  category_id: string;
}

export interface VodStream {
  stream_id: number;
  name: string;
  stream_icon: string;
  container_extension: string;
  category_id: string;
  rating?: string;
}

export interface SeriesItem {
  series_id: number;
  name: string;
  cover: string;
  category_id: string;
  rating?: string;
}

export interface SeriesInfo {
  episodes: Record<string, Episode[]>;
  seasons?: SeriesSeasonMeta[];
  info?: Record<string, unknown>;
}

export interface SeriesSeasonMeta {
  season_number: number;
  name: string;
  episode_count: number;
  cover?: string;
  cover_big?: string;
  overview?: string;
}

export interface Episode {
  id: number;
  title: string;
  container_extension: string;
  episode_num: number;
  season: number;
  info?: Record<string, unknown>;
  added?: string;
  direct_source?: string;
}

// --- Cache helpers ---

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`xtream_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(`xtream_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    const json = JSON.stringify(entry);
    // Skip caching if single entry > 200KB (large category responses)
    if (json.length > 500_000) return;
    localStorage.setItem(`xtream_${key}`, json);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Evict oldest caches to make room
      evictOldestCaches();
      // Retry once
      try {
        const entry: CacheEntry<T> = { data, ts: Date.now() };
        const json = JSON.stringify(entry);
        if (json.length < 500_000) localStorage.setItem(`xtream_${key}`, json);
      } catch { /* give up */ }
    }
  }
}

/** Evict oldest xtream_ caches when quota is full */
function evictOldestCaches(): void {
  try {
    const keys: { key: string; ts: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('xtream_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          keys.push({ key, ts: entry.ts || 0 });
        } catch { keys.push({ key, ts: 0 }); }
      }
    }
    // Sort oldest first, delete half
    keys.sort((a, b) => a.ts - b.ts);
    const toDelete = Math.max(Math.ceil(keys.length / 2), 3);
    for (let i = 0; i < toDelete && i < keys.length; i++) {
      localStorage.removeItem(keys[i].key);
    }
  } catch { /* ignore */ }
}

function enc(s: string) { return encodeURIComponent(s); }

function apiUrl(c: XtreamCredentials, action: string, extra = ''): string {
  return `${PROXY}/api?action=${action}&u=${enc(c.username)}&p=${enc(c.password)}${extra}`;
}

async function cachedFetch<T>(key: string, url: string): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  // Handle corrupted JSON from Starshare (truncated responses for large categories)
  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    // Try to salvage truncated JSON
    const trimmed = text.trim();
    if (trimmed.startsWith('[')) {
      // Truncated array: find last complete object and close the array
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          data = JSON.parse(trimmed.slice(0, lastBrace + 1) + ']') as T;
        } catch {
          return [] as unknown as T;
        }
      } else {
        return [] as unknown as T;
      }
    } else if (trimmed.startsWith('{')) {
      // Truncated object: try to close open braces/brackets
      let attempt = trimmed;
      const lastBrace = attempt.lastIndexOf('}');
      if (lastBrace > 0) {
        attempt = attempt.slice(0, lastBrace + 1);
      }
      // Count unmatched braces
      let braces = 0;
      let brackets = 0;
      for (const ch of attempt) {
        if (ch === '{') braces++;
        else if (ch === '}') braces--;
        else if (ch === '[') brackets++;
        else if (ch === ']') brackets--;
      }
      attempt += ']'.repeat(Math.max(0, brackets)) + '}'.repeat(Math.max(0, braces));
      try {
        data = JSON.parse(attempt) as T;
      } catch {
        return {} as unknown as T;
      }
    } else {
      return [] as unknown as T;
    }
  }

  cacheSet(key, data);
  return data;
}

// --- Live TV ---

export async function getLiveCategories(c: XtreamCredentials): Promise<LiveCategory[]> {
  return cachedFetch<LiveCategory[]>('live_cats', apiUrl(c, 'get_live_categories'));
}

/** Lazy-load logo map to keep main bundle small */
let logoMapCache: Record<string, string> | null = null;
let logoMapPromise: Promise<Record<string, string>> | null = null;

function getLogoMap(): Promise<Record<string, string>> {
  if (logoMapCache) return Promise.resolve(logoMapCache);
  if (!logoMapPromise) {
    logoMapPromise = import('./logo-map.generated')
      .then(m => { logoMapCache = m.CHANNEL_LOGO_MAP; return logoMapCache; })
      .catch(() => { logoMapCache = {}; return logoMapCache; });
  }
  return logoMapPromise;
}

/** TMDB metadata — loaded as JSON via fetch (doesn't block main thread) */
import type { TmdbEntry } from './tmdb-map.generated';
import { TMDB_GENRES } from './tmdb-map.generated';

type TmdbMapData = { TMDB_MAP: Record<string, TmdbEntry>; TMDB_GENRES: Record<number, string> };
let tmdbMapCache: TmdbMapData | null = null;
let tmdbMapPromise: Promise<TmdbMapData | null> | null = null;

export function getTmdbMap(): Promise<TmdbMapData | null> {
  if (tmdbMapCache) return Promise.resolve(tmdbMapCache);
  if (!tmdbMapPromise) {
    tmdbMapPromise = fetch('/tmdb-data.json')
      .then(r => r.json())
      .then((data: Record<string, TmdbEntry>) => {
        tmdbMapCache = { TMDB_MAP: data, TMDB_GENRES };
        return tmdbMapCache;
      })
      .catch(() => { tmdbMapCache = { TMDB_MAP: {}, TMDB_GENRES }; return tmdbMapCache; });
  }
  return tmdbMapPromise;
}

/** Patch empty stream_icon from the generated logo map, filter hidden, tag relocated */
async function enrichIcons(streams: LiveStream[]): Promise<LiveStream[]> {
  const map = await getLogoMap();
  const result: LiveStream[] = [];
  for (const s of streams) {
    // Skip hidden channels (separators, ghosts, junk)
    if (HIDDEN_STREAM_IDS.has(s.stream_id)) continue;
    // Skip relocated channels (they'll appear in their correct experience instead)
    if (RELOCATE_MAP[s.stream_id]) continue;
    if (!s.stream_icon || s.stream_icon.trim() === '') {
      const mapped = map[String(s.stream_id)];
      if (mapped) s.stream_icon = mapped;
    }
    result.push(s);
  }
  return result;
}

/** Get channels that were relocated TO a specific experience */
export function getRelocatedChannels(experience: string): number[] {
  return Object.entries(RELOCATE_MAP)
    .filter(([, exp]) => exp === experience)
    .map(([id]) => Number(id));
}

export async function getLiveStreams(c: XtreamCredentials, catId: string): Promise<LiveStream[]> {
  const streams = await cachedFetch<LiveStream[]>(
    `live_streams_${catId}`,
    apiUrl(c, 'get_live_streams', `&category_id=${catId}`)
  );
  return enrichIcons(streams);
}

export async function getAllLiveStreams(c: XtreamCredentials): Promise<LiveStream[]> {
  const streams = await cachedFetch<LiveStream[]>('live_streams_all', apiUrl(c, 'get_live_streams'));
  return enrichIcons(streams);
}

// --- VOD ---

export async function getVodCategories(c: XtreamCredentials): Promise<LiveCategory[]> {
  return cachedFetch<LiveCategory[]>('vod_cats', apiUrl(c, 'get_vod_categories'));
}

export async function getVodStreams(c: XtreamCredentials, catId: string): Promise<VodStream[]> {
  return cachedFetch<VodStream[]>(
    `vod_streams_${catId}`,
    apiUrl(c, 'get_vod_streams', `&category_id=${catId}`)
  );
}

// --- VOD Info (detailed movie metadata) ---

export interface VodInfo {
  info: {
    name?: string;
    plot?: string;
    description?: string;
    director?: string;
    actors?: string;
    cast?: string;
    releasedate?: string;
    episode_run_time?: string;
    youtube_trailer?: string;
    tmdb_id?: string;
    genre?: string;
    cover_big?: string;
    duration?: string;
    rating?: string;
  };
  movie_data?: {
    stream_id?: number;
    container_extension?: string;
  };
}

export async function getVodInfo(c: XtreamCredentials, vodId: number): Promise<VodInfo | null> {
  try {
    return await cachedFetch<VodInfo>(
      `vod_info_${vodId}`,
      apiUrl(c, 'get_vod_info', `&vod_id=${vodId}`)
    );
  } catch {
    return null;
  }
}

// --- Series ---

export async function getSeriesCategories(c: XtreamCredentials): Promise<LiveCategory[]> {
  return cachedFetch<LiveCategory[]>('series_cats', apiUrl(c, 'get_series_categories'));
}

export async function getSeries(c: XtreamCredentials, catId: string): Promise<SeriesItem[]> {
  return cachedFetch<SeriesItem[]>(
    `series_${catId}`,
    apiUrl(c, 'get_series', `&category_id=${catId}`)
  );
}

export async function getSeriesInfo(c: XtreamCredentials, seriesId: number): Promise<SeriesInfo> {
  return cachedFetch<SeriesInfo>(
    `series_info_${seriesId}`,
    apiUrl(c, 'get_series_info', `&series_id=${seriesId}`)
  );
}

// --- Stream URL Builders ---
// ALL streams + API go through our VPS proxy (Cloudflare blocks browser→datahub direct)

// Stream quality setting — persisted in localStorage
const QUALITY_KEY = 'tivi_stream_quality';
export type StreamQuality = 'hd' | 'eco';

export function getStreamQuality(): StreamQuality {
  const v = localStorage.getItem(QUALITY_KEY);
  return v === 'eco' ? 'eco' : 'hd';
}

export function setStreamQuality(q: StreamQuality) {
  localStorage.setItem(QUALITY_KEY, q);
}

export function buildLiveUrl(c: XtreamCredentials, streamId: number, quality?: StreamQuality): string {
  const q = quality || getStreamQuality();
  // hd = video passthrough (zero CPU, source quality)
  // eco = 480p re-encode (1.2 Mbps, works on slow connections)
  return `${PROXY}/live?id=${streamId}&u=${enc(c.username)}&p=${enc(c.password)}${q === 'eco' ? '&q=eco' : ''}`;
}

export function buildVodUrl(c: XtreamCredentials, streamId: number, ext = 'mp4'): string {
  const q = getStreamQuality();
  if (ext === 'mkv' || ext === 'avi') {
    // MKV/AVI → FFmpeg remux on VPS (eco = 1080p re-encode for slow connections)
    return `${PROXY}/vod?id=${streamId}&u=${enc(c.username)}&p=${enc(c.password)}&ext=${ext}&type=movie${q === 'eco' ? '&q=eco' : ''}`;
  }
  const url = `${STREAM_BASE}/movie/${enc(c.username)}/${enc(c.password)}/${streamId}.${ext}`;
  return `${PROXY}?url=${encodeURIComponent(url)}`;
}

export function buildSeriesUrl(c: XtreamCredentials, episodeId: number, ext = 'mp4'): string {
  const q = getStreamQuality();
  if (ext === 'mkv' || ext === 'avi') {
    return `${PROXY}/vod?id=${episodeId}&u=${enc(c.username)}&p=${enc(c.password)}&ext=${ext}&type=series${q === 'eco' ? '&q=eco' : ''}`;
  }
  const url = `${STREAM_BASE}/series/${enc(c.username)}/${enc(c.password)}/${episodeId}.${ext}`;
  return `${PROXY}?url=${encodeURIComponent(url)}`;
}

// --- Dynamic Channel Health ---
// Tracks which channels are live/offline/dead
// Checked on play attempt, cached with TTL, recheck periodically

const HEALTH_KEY = 'tivi_channel_health';
const HEALTH_TTL = 30 * 60 * 1000; // 30 min before recheck
const PLACEHOLDER_SIZE = 6148352; // Starshare offline placeholder is exactly this size

export type ChannelHealth = 'unknown' | 'live' | 'offline' | 'dead';

interface HealthEntry {
  status: ChannelHealth;
  ts: number;
  size?: number;
}

function getHealthCache(): Record<string, HealthEntry> {
  try {
    return JSON.parse(localStorage.getItem(HEALTH_KEY) || '{}');
  } catch { return {}; }
}

function setHealthCache(cache: Record<string, HealthEntry>) {
  try { localStorage.setItem(HEALTH_KEY, JSON.stringify(cache)); } catch {}
}

export function getChannelHealth(streamId: number): ChannelHealth {
  const cache = getHealthCache();
  const entry = cache[String(streamId)];
  if (!entry) return 'unknown';
  if (Date.now() - entry.ts > HEALTH_TTL) return 'unknown'; // Expired, recheck
  return entry.status;
}

export function markChannelHealth(streamId: number, status: ChannelHealth, size?: number) {
  const cache = getHealthCache();
  cache[String(streamId)] = { status, ts: Date.now(), size };
  setHealthCache(cache);
}

// Called by player when stream starts or fails
export function onStreamSuccess(streamId: number) {
  markChannelHealth(streamId, 'live');
}

export function onStreamFail(streamId: number) {
  markChannelHealth(streamId, 'dead');
}

// Filter streams: show all unknown + live, hide dead, show offline with badge
export function filterHealthyStreams(streams: LiveStream[]): LiveStream[] {
  return streams.filter(s => {
    const health = getChannelHealth(s.stream_id);
    return health !== 'dead'; // Show unknown, live, offline — hide confirmed dead
  });
}

// Get health badge for UI
export function getHealthBadge(streamId: number): { show: boolean; label: string; color: string } {
  const health = getChannelHealth(streamId);
  switch (health) {
    case 'offline': return { show: true, label: 'Offline', color: 'bg-amber-500/20 text-amber-400' };
    case 'dead': return { show: true, label: 'Down', color: 'bg-red-500/20 text-red-400' };
    default: return { show: false, label: '', color: '' };
  }
}

// Batch health check — test a list of stream IDs via VPS
export async function batchHealthCheck(c: XtreamCredentials, streamIds: number[]): Promise<void> {
  // Only check unknown channels (don't recheck recently tested ones)
  const toCheck = streamIds.filter(id => getChannelHealth(id) === 'unknown');
  if (toCheck.length === 0) return;

  // Check first 5 per batch (don't overload the connection)
  for (const id of toCheck.slice(0, 5)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `${PROXY}/live?id=${id}&u=${enc(c.username)}&p=${enc(c.password)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const reader = res.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          reader.cancel();
          if (value && value.length > 1000) {
            markChannelHealth(id, 'live', value.length);
          } else {
            markChannelHealth(id, 'dead', value?.length || 0);
          }
        }
      } else {
        markChannelHealth(id, 'dead');
      }
    } catch {
      markChannelHealth(id, 'dead');
    }
  }
}

// --- Quality grouping ---

export interface QualityVariant {
  streamId: number;
  quality: 'SD' | 'HD' | 'FHD' | '4K' | 'UHD';
  name: string;
  icon: string;
}

export interface GroupedChannel {
  name: string;
  icon: string;
  variants: QualityVariant[];
  bestQuality: string;
}

function normalizeChannelName(name: string): string {
  let n = name;
  // Strip prefixes: "UK || ", "UK : ", "UHD ▎", "|AF| ", "FR (C+AF) "
  n = n.replace(/^(UK\s*[\|:]+\s*|UHD\s*▎\s*|\|[A-Z]+\|\s*|FR\s*\([^)]*\)\s*)/i, '');
  // Strip suffixes: [UK], (4K), HD, FHD, UHD
  n = n.replace(/\s*[\[(][^\])]*[\])]\s*$/g, '');
  n = n.replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '');
  n = n.replace(/\s*(HD|FHD|UHD|4K|SD)\s*$/gi, '');
  n = n.replace(/\s+/g, ' ').trim();
  // Remove trailing S (for "MAIN EVENTS" vs "MAIN EVENT")
  n = n.replace(/S\s*$/i, '');
  return n;
}

function detectQuality(name: string): 'SD' | 'HD' | 'FHD' | '4K' | 'UHD' {
  if (name.includes('4K') || name.includes('(4K)')) return '4K';
  if (/\bUHD\b/i.test(name)) return 'UHD';
  if (/\bFHD\b/i.test(name)) return 'FHD';
  if (/\bSD\b/i.test(name)) return 'SD';
  return 'HD';
}

const QUALITY_ORDER = { 'SD': 0, 'HD': 1, 'FHD': 2, '4K': 3, 'UHD': 4 };

export function groupChannelsByQuality(streams: LiveStream[]): GroupedChannel[] {
  const groups = new Map<string, GroupedChannel>();

  for (const s of streams) {
    const norm = normalizeChannelName(s.name);
    const quality = detectQuality(s.name);

    if (!groups.has(norm)) {
      groups.set(norm, {
        name: norm,
        icon: s.stream_icon || '',
        variants: [],
        bestQuality: quality,
      });
    }

    const group = groups.get(norm)!;
    group.variants.push({ streamId: s.stream_id, quality, name: s.name, icon: s.stream_icon || '' });

    // Update best quality
    if (QUALITY_ORDER[quality] > QUALITY_ORDER[group.bestQuality as keyof typeof QUALITY_ORDER]) {
      group.bestQuality = quality;
    }

    // Use best available icon
    if (!group.icon && s.stream_icon) group.icon = s.stream_icon;
    if (s.stream_icon?.startsWith('https://') && !group.icon.startsWith('https://')) {
      group.icon = s.stream_icon;
    }
  }

  return Array.from(groups.values());
}

// --- Per-Channel Probing (lightweight, no FFmpeg) ---
// Calls VPS /probe endpoint which does HTTP byte-test on each channel
// Returns status map: {streamId: "live"|"dead"|"offline"|"weak"}
// App calls this when channels are displayed — dead ones get hidden

const PROBE_CACHE_KEY = 'tivi_probe_cache';
const PROBE_CACHE_TTL = 30 * 60 * 1000; // 30 min cache per channel

interface ProbeCache {
  [streamId: string]: { status: string; ts: number };
}

function getProbeCache(): ProbeCache {
  try { return JSON.parse(localStorage.getItem(PROBE_CACHE_KEY) || '{}'); } catch { return {}; }
}

function setProbeCache(cache: ProbeCache) {
  try {
    // Enforce max 10000 entries
    const entries = Object.entries(cache);
    if (entries.length > 10000) {
      entries.sort((a, b) => a[1].ts - b[1].ts);
      cache = Object.fromEntries(entries.slice(entries.length - 10000));
    }
    localStorage.setItem(PROBE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getProbeStatus(streamId: number): string | null {
  const cache = getProbeCache();
  const entry = cache[String(streamId)];
  if (!entry) return null;
  if (Date.now() - entry.ts > PROBE_CACHE_TTL) return null; // expired
  return entry.status;
}

export function isChannelProbeAlive(streamId: number): boolean {
  // Check verified set first (two-tier: ffprobe + ffmpeg decode)
  if (verifiedSet !== null && verifiedSet.size > 0) {
    return verifiedSet.has(streamId);
  }
  // Fall back to legacy server probe set
  if (serverAliveSet !== null && serverAliveSet.size > 0) {
    return serverAliveSet.has(streamId);
  }
  // Fall back to client probe cache
  const status = getProbeStatus(streamId);
  if (status === null) return true; // unknown = show it
  return status === 'live' || status === 'weak';
}

// Active probe sets to prevent duplicate requests
const activeProbes = new Set<string>();

export async function probeChannels(c: XtreamCredentials, streamIds: number[]): Promise<Record<string, string>> {
  // Filter out already-cached channels
  const cache = getProbeCache();
  const now = Date.now();
  const toCheck = streamIds.filter(id => {
    const entry = cache[String(id)];
    if (entry && now - entry.ts < PROBE_CACHE_TTL) return false; // still fresh
    return true;
  });

  if (toCheck.length === 0) return {};

  // Batch in groups of 20 (VPS limit)
  const allResults: Record<string, string> = {};
  for (let i = 0; i < toCheck.length; i += 20) {
    const batch = toCheck.slice(i, i + 20);
    const batchKey = batch.join(',');

    // Skip if this exact batch is already being probed
    if (activeProbes.has(batchKey)) continue;
    activeProbes.add(batchKey);

    try {
      // Probe uses VPS server-side credentials — no secrets in client bundle
      const url = `${PROXY}/probe?ids=${batch.join(',')}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();

      // Update cache + results
      const updatedCache = getProbeCache();
      for (const id of batch) {
        const status = data[String(id)];
        if (status) {
          updatedCache[String(id)] = { status, ts: Date.now() };
          allResults[String(id)] = status;
        }
      }
      setProbeCache(updatedCache);
    } catch {
      // Probe failed — don't mark as dead, just skip
    } finally {
      activeProbes.delete(batchKey);
    }
  }

  return allResults;
}

// --- Server Probe Data (pre-load from VPS cron) ---
// Fetches /probe-results.json built by cron-probe.py every hour
// Seeds the probe cache so dead channels are hidden immediately on load

export interface ServerProbeData {
  ts: string | null;
  total: number;
  alive: number;
  alive_pct: number;
  alive_set: number[];
}

let serverProbePromise: Promise<ServerProbeData | null> | null = null;

export async function fetchServerProbeData(): Promise<ServerProbeData | null> {
  if (serverProbePromise) return serverProbePromise;
  serverProbePromise = (async () => {
    try {
      // Vercel copy is from our deep-probe.cjs (accurate byte-level checks)
      // VPS probe-results.json is broken (marks everything alive without real probing)
      let res = await fetch('/probe-results.json', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!res?.ok) res = await fetch(`${PROXY}/probe-results.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json() as ServerProbeData;
      if (!data.alive_set?.length) return null;
      return data;
    } catch { return null; }
    finally { serverProbePromise = null; }
  })();
  return serverProbePromise;
}

// Standalone alive set from server — checked by isChannelProbeAlive()
// Separate from probe cache (which has 3000 entry limit)
let serverAliveSet: Set<number> | null = null;

export function seedProbeCacheFromServer(data: ServerProbeData): void {
  serverAliveSet = new Set(data.alive_set);
}

// Two-tier verified set (ffprobe + ffmpeg decode — video AND audio confirmed)
// Takes priority over serverAliveSet when available
let verifiedSet: Set<number> | null = null;
let verifiedPromise: Promise<VerifiedData | null> | null = null;

export interface VerifiedData {
  ts: string;
  total: number;
  verified: number;
  verified_pct: number;
  verified_set: number[];
  experiences?: Record<string, number[]>;
  experience_categories?: Record<string, string[]>;
}

export async function fetchVerifiedData(): Promise<VerifiedData | null> {
  if (verifiedPromise) return verifiedPromise;
  verifiedPromise = (async () => {
    try {
      const res = await fetch(`${PROXY}/verified.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json() as VerifiedData;
      if (!data.verified_set?.length) return null;
      console.log('[VERIFIED] Loaded %d channels (%.1f%% of %d)', data.verified, data.verified_pct, data.total);
      return data;
    } catch { return null; }
    finally { verifiedPromise = null; }
  })();
  return verifiedPromise;
}

let experienceMap: Record<string, Set<number>> | null = null;
let experienceCatMap: Record<string, string[]> | null = null;

export function seedVerifiedSet(data: VerifiedData): void {
  verifiedSet = new Set(data.verified_set);
  // Seed experience classification if available
  if (data.experiences) {
    experienceMap = {};
    for (const [exp, ids] of Object.entries(data.experiences)) {
      experienceMap[exp] = new Set(ids);
    }
    console.log('[VERIFIED] Set seeded with %d channels, %d experiences', verifiedSet.size, Object.keys(experienceMap).length);
  } else {
    console.log('[VERIFIED] Set seeded with %d channels (no experiences)', verifiedSet.size);
  }
  // Seed experience_categories (which Starshare categories contain classified channels per experience)
  if (data.experience_categories) {
    experienceCatMap = data.experience_categories;
    console.log('[VERIFIED] Experience categories seeded for %d experiences', Object.keys(experienceCatMap).length);
  }
}

/** Get stream IDs classified into an experience by name-based analysis */
export function getExperienceIds(experienceId: string): Set<number> | null {
  if (!experienceMap) return null;
  return experienceMap[experienceId] || null;
}

/** Get extra Starshare category IDs that contain classified channels for an experience */
export function getExperienceCategoryIds(experienceId: string): string[] | null {
  if (!experienceCatMap) return null;
  return experienceCatMap[experienceId] || null;
}


// --- VPS Health Data (server-side hourly scan) ---
// The VPS checks every category hourly and writes /channels.json
// App fetches this on load → filters dead categories from UI
// Dead categories auto-recover when next hourly scan finds them alive

export interface VpsHealthData {
  categories: Record<string, { name: string; status: string; live: number; total: number }>;
  lastChecked: string | null;
  totalLive: number;
  totalDead: number;
  liveCategories?: string[];
  deadCategories?: string[];
  offlineCategories?: string[];
}

const VPS_HEALTH_KEY = 'tivi_vps_health';
const VPS_HEALTH_TTL = 10 * 60 * 1000; // Cache for 10 min (VPS updates hourly)
let vpsHealthPromise: Promise<VpsHealthData> | null = null;

export async function fetchVpsHealth(): Promise<VpsHealthData> {
  // Dedup concurrent calls
  if (vpsHealthPromise) return vpsHealthPromise;

  vpsHealthPromise = (async () => {
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(VPS_HEALTH_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < VPS_HEALTH_TTL) return data as VpsHealthData;
      }
    } catch {}

    try {
      const res = await fetch(`${PROXY}/channels.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Health fetch failed');
      const data = await res.json() as VpsHealthData;
      try {
        localStorage.setItem(VPS_HEALTH_KEY, JSON.stringify({ data, ts: Date.now() }));
      } catch {}
      return data;
    } catch {
      // Return empty — don't filter anything if health data unavailable
      return { categories: {}, lastChecked: null, totalLive: 0, totalDead: 0 };
    } finally {
      vpsHealthPromise = null;
    }
  })();

  return vpsHealthPromise;
}

export function isCategoryDead(healthData: VpsHealthData, catId: string): boolean {
  if (!healthData.deadCategories) return false;
  return healthData.deadCategories.includes(catId);
}

export function isCategoryOffline(healthData: VpsHealthData, catId: string): boolean {
  if (!healthData.offlineCategories) return false;
  return healthData.offlineCategories.includes(catId);
}

export function getCategoryStatus(healthData: VpsHealthData, catId: string): string {
  const cat = healthData.categories[catId];
  return cat?.status || 'unknown';
}

// --- EPG (Electronic Program Guide) ---
// ~10% of channels have EPG data (sports, UK, DSTV, India)
// Titles and descriptions are base64-encoded by the API

export interface EpgListing {
  title: string;
  description: string;
  start: string;
  end: string;
  startTimestamp: number;
  stopTimestamp: number;
}

export async function getShortEpg(c: XtreamCredentials, streamId: number, limit = 4): Promise<EpgListing[]> {
  try {
    const url = apiUrl(c, 'get_short_epg', `&stream_id=${streamId}&limit=${limit}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.epg_listings || []).map((e: Record<string, string>) => ({
      title: safeAtob(e.title || ''),
      description: safeAtob(e.description || ''),
      start: e.start || '',
      end: e.end || '',
      startTimestamp: Number(e.start_timestamp || 0),
      stopTimestamp: Number(e.stop_timestamp || 0),
    }));
  } catch {
    return [];
  }
}

/** Get the currently-airing programme for a stream (if EPG available) */
export async function getNowPlaying(c: XtreamCredentials, streamId: number): Promise<EpgListing | null> {
  const listings = await getShortEpg(c, streamId, 4);
  if (listings.length === 0) return null;
  const now = Date.now() / 1000;
  return listings.find(l => l.startTimestamp <= now && l.stopTimestamp > now) || listings[0] || null;
}

function safeAtob(s: string): string {
  try { return atob(s); } catch { return s; }
}

// --- Thumbnail sort utility ---
// Sorts streams: HTTPS icons first, then HTTP icons, then no icons

export function sortByIconQuality<T extends { stream_icon: string }>(streams: T[]): T[] {
  return [...streams].sort((a, b) => {
    const scoreA = iconScore(a.stream_icon);
    const scoreB = iconScore(b.stream_icon);
    return scoreB - scoreA;
  });
}

function iconScore(icon: string): number {
  if (!icon) return 0;
  if (icon.startsWith('https://')) return 2;
  if (icon.startsWith('http://')) return 1;
  return 0;
}

// --- Gem-first sort (premium channels surface first) ---
import { GEM_STREAM_IDS, HIDDEN_STREAM_IDS, RELOCATE_MAP } from './collections';

/** Sort channels with gems first, then by icon quality */
export function sortGemsFirst<T extends { stream_id: number; stream_icon: string }>(streams: T[]): T[] {
  return [...streams].sort((a, b) => {
    const aGem = GEM_STREAM_IDS.has(a.stream_id) ? 100 : 0;
    const bGem = GEM_STREAM_IDS.has(b.stream_id) ? 100 : 0;
    if (aGem !== bGem) return bGem - aGem;
    // Fallback to icon quality
    return iconScore(b.stream_icon) - iconScore(a.stream_icon);
  });
}

// --- Free HLS Channels ---
// 5,234 free channels from /free-channels.json, merged into themes + regions

export interface FreeChannel {
  id: string;
  name: string;
  url: string;
  logo: string;
  experience: string;
  culture: string;
  source: 'free';
}

let freeChannelCache: FreeChannel[] | null = null;
let freeChannelPromise: Promise<FreeChannel[]> | null = null;

export function getFreeChannels(): Promise<FreeChannel[]> {
  if (freeChannelCache) return Promise.resolve(freeChannelCache);
  if (!freeChannelPromise) {
    freeChannelPromise = fetch('/free-channels-curated.json')
      .then(r => r.json())
      .then((data: FreeChannel[]) => { freeChannelCache = data; return data; })
      .catch(() => { freeChannelCache = []; return []; });
  }
  return freeChannelPromise;
}

export function getFreeChannelsByExperience(experience: string): Promise<FreeChannel[]> {
  return getFreeChannels().then(all => all.filter(ch => ch.experience === experience));
}

export function getFreeChannelsByCulture(culture: string): Promise<FreeChannel[]> {
  return getFreeChannels().then(all => all.filter(ch => ch.culture === culture));
}

/** Convert a FreeChannel to LiveStream for unified rendering */
export function freeToLiveStream(ch: FreeChannel): LiveStream {
  return {
    stream_id: parseInt(ch.id.replace('free-', '')) + 900000,
    name: ch.name,
    stream_icon: ch.logo,
    epg_channel_id: '',
    category_id: 'free',
  };
}

/** Build a map of freeStreamId -> HLS URL for playback */
export function buildFreeUrlMap(channels: FreeChannel[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const ch of channels) {
    const fakeId = parseInt(ch.id.replace('free-', '')) + 900000;
    map[fakeId] = ch.url;
  }
  return map;
}

/** Check if a stream_id belongs to a free channel */
export function isFreeChannel(streamId: number): boolean {
  return streamId >= 900000;
}

// --- Cache management ---

export function clearXtreamCache(): void {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('xtream_')) {
      localStorage.removeItem(key);
    }
  }
}
