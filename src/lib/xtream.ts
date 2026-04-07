const STREAM_BASE = (import.meta.env.VITE_XTREAM_STREAM || 'http://datahub11.com:80').trim();
const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 10000; // 10s timeout for API calls

/**
 * Strip upstream provider/distributor branding from channel names.
 * DashTivi+ owns the channel layer — no DSTV, CRIC, country codes, etc.
 */
const STRIP_PREFIX = /^(?:DSTV|CRIC|AZAM|OSN|SuperSport|UKHD|Sport|News|Music|Kids|BG|PL|IN|RO|PT|UK|TR|CZ|PK|US|USA|FRA|IR|NL|BR|SE|RU|MY|AR|BD|DK|IS|FI|AU|AT|FR|PB|TM|EX-YU|NEPAL|NP|IQ|Eg|Lb|Sa|Iq|Sy|Mor|Dz|En|Ar|Telugu|Tamil|Marathi|Guj|GUJ|Kannada|ORI|MAL)\s*[:\|]+\s*/i;
const STRIP_SUFFIX = /\s*\((?:FHD|SD|HD|4K|Local|NEW)\)\s*$/gi;
const STRIP_UNICODE = /\s*[ᴴᴰ⁴ᵏ✦]+\s*/g;

// Country code → flag emoji mapping (extracted from channel name prefixes)
const COUNTRY_PREFIX = /^([A-Za-z\-]+)\s*[:\|]+\s*/;
const COUNTRY_FLAGS: Record<string, string> = {
  UK: '🇬🇧', US: '🇺🇸', USA: '🇺🇸', EN: '🇬🇧', FR: '🇫🇷', FRA: '🇫🇷',
  IN: '🇮🇳', PK: '🇵🇰', BD: '🇧🇩', AR: '🇸🇦', BR: '🇧🇷', PT: '🇵🇹',
  TR: '🇹🇷', PL: '🇵🇱', RO: '🇷🇴', BG: '🇧🇬', NL: '🇳🇱', SE: '🇸🇪',
  DK: '🇩🇰', IS: '🇮🇸', FI: '🇫🇮', CZ: '🇨🇿', IR: '🇮🇷', RU: '🇷🇺',
  MY: '🇲🇾', AU: '🇦🇺', AT: '🇦🇹', IQ: '🇮🇶', NP: '🇳🇵', NEPAL: '🇳🇵',
  EG: '🇪🇬', SA: '🇸🇦', SY: '🇸🇾', LB: '🇱🇧', MOR: '🇲🇦', DZ: '🇩🇿',
  'EX-YU': '🇷🇸',
};
// Language-specific prefixes (not countries but still useful for context)
const LANG_FLAGS: Record<string, string> = {
  TELUGU: '🇮🇳', TAMIL: '🇮🇳', MARATHI: '🇮🇳', GUJ: '🇮🇳', KANNADA: '🇮🇳', ORI: '🇮🇳', MAL: '🇮🇳',
  ISLAM: '☪️',
};
// Provider prefixes — no flag, just strip
const PROVIDER_PREFIXES = new Set(['DSTV', 'CRIC', 'AZAM', 'OSN', 'SUPERSPORT', 'UKHD', 'SPORT', 'NEWS', 'MUSIC', 'KIDS', 'PB', 'TM']);

export interface ChannelMeta {
  name: string;
  flag: string | null;
  qualityTag: string | null;
  isEnglish: boolean;
}

/** Extract country flag + quality from raw channel name, then clean it */
export function parseChannelMeta(rawName: string, quality?: string): ChannelMeta {
  let flag: string | null = null;
  let isEnglish = false;
  const prefixMatch = rawName.match(COUNTRY_PREFIX);
  if (prefixMatch) {
    const code = prefixMatch[1].toUpperCase();
    if (!PROVIDER_PREFIXES.has(code)) {
      flag = COUNTRY_FLAGS[code] || LANG_FLAGS[code] || null;
      if (code === 'UK' || code === 'US' || code === 'USA' || code === 'EN') isEnglish = true;
    }
  }
  // Detect English from name keywords when no prefix
  if (!flag) {
    const lower = rawName.toLowerCase();
    if (lower.includes('bbc') || lower.includes('sky sports') || lower.includes('espn') ||
        lower.includes('cnn') || lower.includes('fox') || lower.includes('hbo') ||
        lower.includes('nickelodeon') || lower.includes('cartoon network') ||
        lower.includes('discovery') || lower.includes('national geographic') ||
        lower.includes('bein sports english') || lower.includes('paramount')) {
      isEnglish = true;
      flag = '🇬🇧';
    }
  }
  // Quality tag from suffix or curator field
  let qualityTag = quality || null;
  if (!qualityTag) {
    const qMatch = rawName.match(/\((?:FHD|SD|HD|4K)\)\s*$/i) || rawName.match(/\b(4K|FHD|UHD)\b/i);
    if (qMatch) qualityTag = qMatch[1]?.toUpperCase() || qMatch[0].replace(/[()]/g, '').toUpperCase();
  }
  return { name: cleanChannelName(rawName), flag, qualityTag, isEnglish };
}

export function cleanChannelName(name: string): string {
  let clean = name;
  // Strip up to 2 nested prefixes (e.g. "Sport | Ar: KSA Sport 2")
  for (let i = 0; i < 2; i++) {
    const before = clean;
    clean = clean.replace(STRIP_PREFIX, '');
    if (clean === before) break;
  }
  clean = clean
    .replace(STRIP_SUFFIX, '')
    .replace(STRIP_UNICODE, ' ')
    .replace(/\|\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || name;
}

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
  if (u.includes('webhop.live') || u.includes('imdb.com') || u.includes('wikia.nocookie.net') || u.includes('paste.pics') || u.includes('tensports.com.pk') || u.includes('stariptv.fun') || u.includes('starapk1.com') || u.includes('stackpathcdn.com') || u.includes('QuranTVSA')) {
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
  added?: string;
}

export interface SeriesItem {
  series_id: number;
  name: string;
  cover: string;
  category_id: string;
  last_modified?: string;
  rating?: string;
}

export interface SeriesInfo {
  episodes: Record<string, Episode[]>;
  seasons?: SeriesSeasonMeta[];
  info?: Record<string, unknown>;
}

interface SeriesSeasonMeta {
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

/** Lazy-load logo map to keep main bundle small */
// Logo map removed — 100% icon coverage in database now.
// enrichIcons only patches icons for the Xtream fallback path, which rarely fires.
function getLogoMap(): Promise<Record<string, string>> {
  return Promise.resolve({});
}

/** TMDB metadata — loaded as JSON via fetch (doesn't block main thread) */
import type { TmdbEntry } from './tmdb-map.generated';
import { TMDB_GENRES } from './tmdb-map.generated';
import { consumePrefetchedCurator, consumePrefetchedVee } from './preloader';

type TmdbMapData = { TMDB_MAP: Record<string, TmdbEntry>; TMDB_GENRES: Record<number, string> };
let tmdbMapCache: TmdbMapData | null = null;
let tmdbMapPromise: Promise<TmdbMapData | null> | null = null;
let tmdbMapFetchedAt = 0;

export function getTmdbMap(): Promise<TmdbMapData | null> {
  // TTL check — re-fetch if data is stale
  if (tmdbMapCache && Date.now() - tmdbMapFetchedAt < CACHE_TTL) return Promise.resolve(tmdbMapCache);
  if (tmdbMapPromise && Date.now() - tmdbMapFetchedAt < CACHE_TTL) return tmdbMapPromise;
  // Stale — clear and re-fetch
  tmdbMapCache = null;
  tmdbMapPromise = null;

  tmdbMapPromise = fetch('/tmdb-data.json')
    .then(r => r.json())
    .then((data: Record<string, TmdbEntry>) => {
      tmdbMapCache = { TMDB_MAP: data, TMDB_GENRES };
      tmdbMapFetchedAt = Date.now();
      return tmdbMapCache;
    })
    .catch(() => { tmdbMapCache = { TMDB_MAP: {}, TMDB_GENRES }; tmdbMapFetchedAt = Date.now(); return tmdbMapCache; });
  return tmdbMapPromise;
}

/** Patch empty stream_icon from the generated logo map, filter hidden, tag relocated */
async function enrichIcons(streams: LiveStream[]): Promise<LiveStream[]> {
  const map = await getLogoMap();
  const result: LiveStream[] = [];
  for (const s of streams) {
    // Parse metadata from raw name before cleaning
    const meta = parseChannelMeta(s.name);
    channelMetaCache.set(s.stream_id, meta);
    s.name = meta.name;
    // Hidden/relocated filtering now handled by database (is_hidden, curator experiences)
    // This fallback path only runs when curator is unavailable
    if (!s.stream_icon || s.stream_icon.trim() === '') {
      const mapped = map[String(s.stream_id)];
      if (mapped) s.stream_icon = mapped;
    }
    result.push(s);
  }
  return result;
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
  return v === 'eco' ? 'eco' : 'hd'; // Default passthrough — 86% of channels are SD/HD, no transcoding needed
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
  // mkv, avi, ts containers need FFmpeg remux — browsers can't play them natively
  if (ext === 'mkv' || ext === 'avi' || ext === 'ts') {
    return `${PROXY}/vod?id=${streamId}&u=${enc(c.username)}&p=${enc(c.password)}&ext=${ext}&type=movie${q === 'eco' ? '&q=eco' : ''}`;
  }
  const url = `${STREAM_BASE}/movie/${enc(c.username)}/${enc(c.password)}/${streamId}.${ext}`;
  return `${PROXY}?url=${encodeURIComponent(url)}`;
}

/** FFmpeg remux fallback — always works regardless of actual container format */
export function buildVodFallbackUrl(c: XtreamCredentials, streamId: number, ext = 'mp4', type: 'movie' | 'series' = 'movie'): string {
  const q = getStreamQuality();
  return `${PROXY}/vod?id=${streamId}&u=${enc(c.username)}&p=${enc(c.password)}&ext=${ext}&type=${type}${q === 'eco' ? '&q=eco' : ''}`;
}

export function buildSeriesUrl(c: XtreamCredentials, episodeId: number, ext = 'mp4'): string {
  const q = getStreamQuality();
  // mkv, avi, ts containers need FFmpeg remux — browsers can't play them natively
  if (ext === 'mkv' || ext === 'avi' || ext === 'ts') {
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

type ChannelHealth = 'unknown' | 'live' | 'offline' | 'dead';

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

function markChannelHealth(streamId: number, status: ChannelHealth, size?: number) {
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

// --- Quality grouping ---

interface QualityVariant {
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

function getProbeStatus(streamId: number): string | null {
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
let serverProbeFetchedAt = 0;
const SERVER_PROBE_TTL = 10 * 60 * 1000; // 10min

export async function fetchServerProbeData(): Promise<ServerProbeData | null> {
  // TTL check — re-fetch if data is stale
  if (serverProbePromise && Date.now() - serverProbeFetchedAt < SERVER_PROBE_TTL) return serverProbePromise;
  // Stale — clear and re-fetch
  serverProbePromise = null;

  serverProbePromise = (async () => {
    try {
      // Vercel copy is from our deep-probe.cjs (accurate byte-level checks)
      // VPS probe-results.json is broken (marks everything alive without real probing)
      let res = await fetch('/probe-results.json', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!res?.ok) res = await fetch(`${PROXY}/probe-results.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json() as ServerProbeData;
      if (!data.alive_set?.length) return null;
      serverProbeFetchedAt = Date.now();
      return data;
    } catch { return null; }
    finally { /* keep promise for dedup across navigations */ }
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
let verifiedFetchedAt = 0;
const VERIFIED_TTL = 60 * 60 * 1000; // 60min

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
  // TTL check — re-fetch if data is stale
  if (verifiedPromise && Date.now() - verifiedFetchedAt < VERIFIED_TTL) return verifiedPromise;
  // Stale — clear and re-fetch
  verifiedPromise = null;

  verifiedPromise = (async () => {
    try {
      const res = await fetch(`${PROXY}/verified.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json() as VerifiedData;
      if (!data.verified_set?.length) return null;
      verifiedFetchedAt = Date.now();
      return data;
    } catch { return null; }
    finally { /* keep promise for dedup across navigations */ }
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
    // verbose: '[VERIFIED] Set seeded'
  } else {
    // verbose: '[VERIFIED] Set seeded (no experiences)'
  }
  // Seed experience_categories (which Starshare categories contain classified channels per experience)
  if (data.experience_categories) {
    experienceCatMap = data.experience_categories;
    // verbose: '[VERIFIED] Experience categories seeded'
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


// --- Curator Data (Supabase-backed, replaces category loading) ---
// VPS reads from Supabase every 5 min, serves /curator.json
// Contains full channel metadata per experience — no secondary fetches needed

export interface CuratorChannel {
  id: number;
  name: string;
  icon: string;
  quality: string;
  gem: boolean;
  cat: string;
}

export interface CuratorData {
  ts: string;
  total: number;
  experiences: Record<string, CuratorChannel[]>;
}

let curatorData: CuratorData | null = null;
let curatorPromise: Promise<CuratorData | null> | null = null;
let curatorFetchedAt = 0;
const CURATOR_TTL = 30 * 60 * 1000; // 30min

// Cache the feature flag check — don't hit version.json on every call
let curatorFlagChecked = false;
let curatorFlagEnabled = true;

export async function fetchCuratorData(): Promise<CuratorData | null> {
  // TTL check — re-fetch if data is stale
  if (curatorData && Date.now() - curatorFetchedAt < CURATOR_TTL) return curatorData;
  if (curatorPromise && Date.now() - curatorFetchedAt < CURATOR_TTL) return curatorPromise;
  // Stale — clear and re-fetch
  curatorData = null;
  curatorPromise = null;

  // Feature flag — check once per session, not every call
  if (!curatorFlagChecked) {
    curatorFlagChecked = true;
    try {
      const vRes = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(2000) });
      const vData = await vRes.json();
      curatorFlagEnabled = !!vData.curator;
    } catch { curatorFlagEnabled = true; }
  }
  if (!curatorFlagEnabled) return null;

  if (curatorPromise) return curatorPromise;
  curatorPromise = (async () => {
    const t0 = Date.now();
    try {
      // Use prefetched parsed data from splash screen if available
      let data: CuratorData;
      const cached = consumePrefetchedCurator();
      if (cached) {
        data = cached as CuratorData;
      } else {
        const res = await fetch(`${PROXY}/curator.json`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
          console.error('[CURATOR] Fetch failed: HTTP %d', res.status);
          return null;
        }
        data = await res.json() as CuratorData;
      }
      if (!data.experiences || Object.keys(data.experiences).length === 0) {
        console.error('[CURATOR] Empty data — no experiences returned');
        return null;
      }
      curatorData = data;
      curatorFetchedAt = Date.now();
      seedGemSet(data);

      // Validate experiences
      const expCount = Object.keys(data.experiences).length;
      let totalChannels = 0;
      let nullExps: string[] = [];
      let emptyExps: string[] = [];
      for (const [expId, channels] of Object.entries(data.experiences)) {
        if (channels === null) { nullExps.push(expId); continue; }
        if (!Array.isArray(channels)) { console.warn('[CURATOR] Experience %s is not an array:', expId, typeof channels); continue; }
        if (channels.length === 0) { emptyExps.push(expId); continue; }
        totalChannels += channels.length;
        // Validate first channel has required fields
        const first = channels[0];
        if (!first.id || !first.name) {
          console.warn('[CURATOR] Experience %s has channels with missing id/name:', expId, first);
        }
      }
      if (nullExps.length) console.warn('[CURATOR] NULL experiences:', nullExps.join(', '));
      if (emptyExps.length) console.warn('[CURATOR] Empty experiences:', emptyExps.join(', '));

      // Seed verified set
      const allIds: number[] = [];
      for (const channels of Object.values(data.experiences)) {
        if (channels && Array.isArray(channels)) {
          for (const ch of channels) allIds.push(ch.id);
        }
      }
      // Merge with existing verifiedSet instead of overwriting
      if (verifiedSet) {
        for (const id of allIds) verifiedSet.add(id);
      } else {
        verifiedSet = new Set(allIds);
      }

      console.info('[CURATOR] %d experiences, %d channels, %dms', expCount, totalChannels, Date.now() - t0);
      return data;
    } catch (e) {
      console.error('[CURATOR] Fetch error:', e);
      return null;
    }
    finally { /* keep curatorPromise for dedup across navigations */ }
  })();
  return curatorPromise;
}

/** Get curator channels for an experience — logs miss */
export function getCuratorExperience(experienceId: string): CuratorChannel[] | null {
  if (!curatorData) {
    console.warn('[CURATOR] getCuratorExperience(%s) — no curator data loaded', experienceId);
    return null;
  }
  const channels = curatorData.experiences[experienceId];
  if (!channels) {
    console.warn('[CURATOR] Experience "%s" not found. Available: %s', experienceId, Object.keys(curatorData.experiences).join(', '));
    return null;
  }
  if (!Array.isArray(channels)) {
    console.warn('[CURATOR] Experience "%s" is not an array:', experienceId, typeof channels);
    return null;
  }
  if (channels.length === 0) {
    console.warn('[CURATOR] Experience "%s" has 0 channels', experienceId);
  }
  return channels;
}

// Channel metadata cache — populated during curatorToLiveStreams, queried by UI
const channelMetaCache = new Map<number, ChannelMeta>();

export function getChannelMeta(streamId: number): ChannelMeta | undefined {
  return channelMetaCache.get(streamId);
}

/** Convert curator channels to LiveStream format for existing UI compatibility */
export function curatorToLiveStreams(channels: CuratorChannel[]): LiveStream[] {
  return channels.map(ch => {
    const meta = parseChannelMeta(ch.name, ch.quality);
    channelMetaCache.set(ch.id, meta);
    return {
      stream_id: ch.id,
      name: meta.name,
      stream_icon: ch.icon,
      stream_type: 'live' as const,
      category_id: ch.cat || '',
      epg_channel_id: '',
      is_adult: '0',
      custom_sid: '',
      tv_archive: 0,
      direct_source: '',
      tv_archive_duration: 0,
      num: 0,
      added: '',
    };
  });
}

/** Check if curator data is available */
export function hasCuratorData(): boolean {
  return curatorData !== null;
}

// --- VEE Data (AI-curated playlists, 3x daily) ---
// VPS /vee.json — built by vee-engine.py, 30-min cache
// Returns 7 homepage rows + VEE Hot + VEE Explore + 6 moods

export interface VeePlaylist {
  id: string;
  name: string;
  tagline: string;
  channels: CuratorChannel[];
}

interface VeeShadow {
  mood: string;
  channels: CuratorChannel[];
}

interface VeeMatchDay {
  is_match_day: boolean;
  matches: { name: string; league: string; kickoff: string; channels: CuratorChannel[] }[];
  promoted_channels: CuratorChannel[];
}

export interface VeeData {
  ts: string;
  engine: string;
  time_slot: string;
  homepage: VeePlaylist[];
  social_proof: VeePlaylist;
  vee_hot: VeePlaylist;
  vee_explore: VeePlaylist;
  shadows: Record<string, VeeShadow>;
  moods: Record<string, VeePlaylist>;
  match_day: VeeMatchDay | null;
}

let veeData: VeeData | null = null;
let veePromise: Promise<VeeData | null> | null = null;
let veeFetchedAt = 0;
const VEE_TTL = 15 * 60 * 1000; // 15min

export async function fetchVeeData(): Promise<VeeData | null> {
  // TTL check — re-fetch if data is stale
  if (veeData && Date.now() - veeFetchedAt < VEE_TTL) return veeData;
  if (veePromise && Date.now() - veeFetchedAt < VEE_TTL) return veePromise;
  // Stale — clear and re-fetch
  veeData = null;
  veePromise = null;
  veePromise = (async () => {
    try {
      // Use prefetched parsed data from splash screen if available
      let data: VeeData;
      const cachedVee = consumePrefetchedVee();
      if (cachedVee) {
        data = cachedVee as VeeData;
      } else {
        const res = await fetch(`${PROXY}/vee.json`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        data = await res.json() as VeeData;
      }
      if (!data.homepage?.length) return null;
      veeData = data;
      veeFetchedAt = Date.now();
      console.debug('[VEE] Loaded — rows:%d slot:%s', data.homepage.length, data.time_slot);
      return data;
    } catch (e) {
      console.warn('[VEE] Fetch failed:', e);
      return null;
    }
  })();
  return veePromise;
}

export function getVeeData(): VeeData | null { return veeData; }

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
let vpsHealthFetchedAt = 0;
let vpsHealthData: VpsHealthData | null = null;

export async function fetchVpsHealth(): Promise<VpsHealthData> {
  // TTL check — re-fetch if data is stale (10min, matching VPS_HEALTH_TTL)
  if (vpsHealthData && Date.now() - vpsHealthFetchedAt < VPS_HEALTH_TTL) return vpsHealthData;
  if (vpsHealthPromise && Date.now() - vpsHealthFetchedAt < VPS_HEALTH_TTL) return vpsHealthPromise;
  // Stale — clear and re-fetch
  vpsHealthData = null;
  vpsHealthPromise = null;

  vpsHealthPromise = (async () => {
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(VPS_HEALTH_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < VPS_HEALTH_TTL) {
          vpsHealthData = data as VpsHealthData;
          vpsHealthFetchedAt = Date.now();
          return vpsHealthData;
        }
      }
    } catch {}

    try {
      const res = await fetch(`${PROXY}/channels.json`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Health fetch failed');
      const data = await res.json() as VpsHealthData;
      vpsHealthData = data;
      vpsHealthFetchedAt = Date.now();
      try {
        localStorage.setItem(VPS_HEALTH_KEY, JSON.stringify({ data, ts: Date.now() }));
      } catch {}
      return data;
    } catch {
      // Return empty — don't filter anything if health data unavailable
      return { categories: {}, lastChecked: null, totalLive: 0, totalDead: 0 };
    } finally {
      /* keep promise for dedup across navigations */
    }
  })();

  return vpsHealthPromise;
}

export function isCategoryDead(healthData: VpsHealthData, catId: string): boolean {
  if (!healthData.deadCategories) return false;
  return healthData.deadCategories.includes(catId);
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

function safeAtob(s: string): string {
  try { return atob(s); } catch { return s; }
}

function iconScore(icon: string): number {
  if (!icon) return 0;
  if (icon.startsWith('https://')) return 2;
  if (icon.startsWith('http://')) return 1;
  return 0;
}

// --- Gem-first sort (premium channels surface first) ---
// Gems are now tracked in the database (is_gem column). The curator RPC
// already sorts gems first, so this function is mainly for fallback paths.
// We build a gem set from curator data at runtime instead of hardcoding.

const runtimeGemSet = new Set<number>();

/** Register gem IDs from curator data (called when curator loads) */
function seedGemSet(curatorData: CuratorData | null) {
  if (!curatorData?.experiences) return;
  for (const channels of Object.values(curatorData.experiences)) {
    if (!Array.isArray(channels)) continue;
    for (const ch of channels) {
      if (ch.gem) runtimeGemSet.add(ch.id);
    }
  }
}

/** Sort channels with gems first, then by icon quality */
export function sortGemsFirst<T extends { stream_id: number; stream_icon: string }>(streams: T[]): T[] {
  return [...streams].sort((a, b) => {
    const aGem = runtimeGemSet.has(a.stream_id) ? 100 : 0;
    const bGem = runtimeGemSet.has(b.stream_id) ? 100 : 0;
    if (aGem !== bGem) return bGem - aGem;
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
let freeChannelFetchedAt = 0;

export function getFreeChannels(): Promise<FreeChannel[]> {
  // TTL check — re-fetch if data is stale
  if (freeChannelCache && Date.now() - freeChannelFetchedAt < CACHE_TTL) return Promise.resolve(freeChannelCache);
  if (freeChannelPromise && Date.now() - freeChannelFetchedAt < CACHE_TTL) return freeChannelPromise;
  // Stale — clear and re-fetch
  freeChannelCache = null;
  freeChannelPromise = null;

  freeChannelPromise = fetch('/free-channels-curated.json')
    .then(r => r.json())
    .then((data: FreeChannel[]) => { freeChannelCache = data; freeChannelFetchedAt = Date.now(); return data; })
    .catch(() => { freeChannelCache = []; freeChannelFetchedAt = Date.now(); return []; });
  return freeChannelPromise;
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

// ═══════════════════════════════════════════════════════════════════
// Supabase VOD Layer — database-backed movie/series catalog
// Falls back to Xtream API if Supabase unavailable
// ═══════════════════════════════════════════════════════════════════

const SB_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim();
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

interface VodDbItem {
  id: number;
  name: string;
  poster: string;
  quality: string;
  rating: number;
  year: number | null;
  genre: string;
  tmdb_id: number | null;
  gem: boolean;
  ext: string;
  duration: number | null;
  added: number;
}

interface SeriesDbItem {
  id: number;
  name: string;
  cover: string;
  genre: string;
  rating: number;
  tmdb_id: number | null;
  gem: boolean;
  seasons: number | null;
  episodes: number | null;
}

export interface VodCollection {
  id: string;
  name: string;
  description: string;
  source_type: string;
  items: VodDbItem[];
}

let vodCuratorCache: { collections: VodCollection[]; total: number } | null = null;
let seriesCuratorCache: { collections: { id: string; name: string; items: SeriesDbItem[] }[]; total: number } | null = null;

async function sbRpc<T>(fn: string, body: Record<string, unknown> = {}): Promise<T | null> {
  if (!SB_ANON) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Authorization': `Bearer ${SB_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

/** Fetch VOD by category from Supabase (replaces Xtream get_vod_streams) */
export async function getVodByCategory(catId: string, limit = 100): Promise<VodDbItem[]> {
  if (!SB_ANON) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/tivi_vod?category_id=eq.${catId}&is_active=eq.true&is_hidden=eq.false&select=vod_id,name,poster,quality,rating,year,genre,tmdb_id,is_gem,container_extension,added_ts&order=is_gem.desc,rating.desc.nullslast,added_ts.desc.nullslast&limit=${limit}`,
      { headers: { 'apikey': SB_ANON, 'Authorization': `Bearer ${SB_ANON}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: Record<string, unknown>) => ({
      id: r.vod_id, name: r.name, poster: r.poster || '', quality: r.quality || 'SD',
      rating: Number(r.rating) || 0, year: r.year as number | null, genre: (r.genre as string) || '',
      tmdb_id: r.tmdb_id as number | null, gem: !!r.is_gem, ext: (r.container_extension as string) || 'mp4',
      duration: null, added: Number(r.added_ts) || 0,
    })) as VodDbItem[];
  } catch { return []; }
}

/** Fetch series by category from Supabase */
export async function getSeriesByCategory(catId: string, limit = 100): Promise<SeriesDbItem[]> {
  if (!SB_ANON) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/tivi_series?category_id=eq.${catId}&is_active=eq.true&is_hidden=eq.false&select=series_id,name,cover,genre,rating,tmdb_id,is_gem,season_count,episode_count&order=is_gem.desc,rating.desc.nullslast,last_modified_ts.desc.nullslast&limit=${limit}`,
      { headers: { 'apikey': SB_ANON, 'Authorization': `Bearer ${SB_ANON}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: Record<string, unknown>) => ({
      id: r.series_id, name: r.name, cover: r.cover || '', genre: (r.genre as string) || '',
      rating: Number(r.rating) || 0, tmdb_id: r.tmdb_id as number | null, gem: !!r.is_gem,
      seasons: r.season_count as number | null, episodes: r.episode_count as number | null,
    })) as SeriesDbItem[];
  } catch { return []; }
}

/** Search VOD from Supabase */
export async function searchVod(query: string, maxResults = 30): Promise<VodDbItem[]> {
  const data = await sbRpc<VodDbItem[]>('search_vod', { query, max_results: maxResults });
  return data || [];
}

/** Search series from Supabase */
export async function searchSeries(query: string, maxResults = 30): Promise<SeriesDbItem[]> {
  const data = await sbRpc<SeriesDbItem[]>('search_series', { query, max_results: maxResults });
  return data || [];
}

/** Convert VodDbItem to VodStream (compatibility with existing UI) */
export function vodDbToStream(item: VodDbItem): VodStream {
  return {
    stream_id: item.id,
    name: item.name,
    stream_icon: item.poster,
    container_extension: item.ext || 'mp4',
    category_id: '',
    rating: String(item.rating || ''),
    added: String(item.added || ''),
  };
}

/** Convert SeriesDbItem to SeriesItem (compatibility with existing UI) */
export function seriesDbToItem(item: SeriesDbItem): SeriesItem {
  return {
    series_id: item.id,
    name: item.name,
    cover: item.cover,
    category_id: '',
    rating: String(item.rating || ''),
  };
}
