/**
 * catalog.ts — STATIC curated channel source.
 *
 * "We control." All channels come from /tivi-curated.json (207 tested-working
 * channels). No runtime panel fetches, no dynamic health, no verified.json.
 *
 * This module:
 *  - loads /tivi-curated.json once (cached)
 *  - maps each entry to a runtime channel keyed by a numeric stream_id
 *  - builds the playback URL per channel (proxy vs direct HLS)
 *  - applies tier-gating (Full sees all, Starter sees only tier==='starter')
 *
 * The rest of the app consumes this through the curator seam in xtream.ts
 * (fetchCuratorData / getCuratorExperience), so existing pages render
 * unchanged — they just get static data instead of network data.
 */

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();

// Favor 720p (NOT source/4K) — members are on weak West-Africa networks.
const DEFAULT_QUALITY = 'hd';   // BUFFERING FIX (Aziz 2026-08-30 "why is it buffering — it was smooth before"): 'hd720' forced a server re-encode (libx264→720p, ~8-11s spin-up + CPU load = the buffering). 'hd' = -c:v copy (remux only) → near-instant start, no CPU, smooth like before. Tradeoff: copy passes source bitrate (heavier on very slow links); flip back to 'hd720' if Guinea users report mid-stream buffering on data.

// Direct (free HLS) channels get synthetic ids >= this base so the existing
// isFreeChannel(streamId) check (streamId >= 900000 in xtream.ts) treats them
// as non-proxy and the player uses their raw HLS url.
const DIRECT_ID_BASE = 900000;

// ── Raw shape of /tivi-curated.json ─────────────────────────────────
export interface RawCatalogChannel {
  id: string;          // L11, F11980…
  ext_id: string;      // "747283" (proxy) or "free-1687" (direct)
  name: string;
  icon: string;
  experience: string;  // "World Cup" | "Sports" | …
  bucket: string;
  tier: 'starter' | 'full';
  collection: 'worldcup' | null;
  plays: 'proxy' | 'direct';
  url: string | null;  // set for direct channels
  tested: boolean;
  free?: boolean;      // open-source HLS gem, merged into the collection (green/FREE tag)
  language?: string;   // inferred channel language code — 'FR' | 'EN' | 'AR' (faded pill)
  cross?: string[];    // extra experiences this channel also belongs to (cross-reference)
}

interface RawCatalog {
  version: string;
  total: number;
  tiers: { starter: number; full: number };
  experience_order: string[];
  experiences: Record<string, number>;
  channels: RawCatalogChannel[];
  experience_index: Record<string, string[]>;
  collections: Record<string, string[]>;
}

// ── Runtime channel (decorated with stream_id + playback url) ───────
export interface CatalogChannel extends RawCatalogChannel {
  /** Numeric id used everywhere downstream (matches LiveStream.stream_id). */
  stream_id: number;
}

export interface Catalog {
  version: string;
  total: number;
  experienceOrder: string[];            // display names in canonical order
  channels: CatalogChannel[];           // all 207
  byExperience: Record<string, CatalogChannel[]>;  // keyed by DISPLAY name
  byStreamId: Map<number, CatalogChannel>;
  worldcup: CatalogChannel[];           // featured collection
  /** stream_id -> direct HLS url (for plays:"direct" channels). */
  directUrlMap: Map<number, string>;
}

// Map catalog DISPLAY experience -> curator experience id used by the pages.
// (HomePage/LiveTVPage/ExperienceHomePage query curator by these ids.)
const EXPERIENCE_TO_CURATOR_ID: Record<string, string> = {
  'World Cup': 'worldcup',
  'Sports': 'sports',
  'Movies': 'movies',
  'Entertainment': 'entertainment',
  'Français': 'french',
  'African': 'africa',
  'Arabic': 'arabic',
  'Kids': 'kids',
  'News': 'news',
  'Documentary': 'documentary',
  '4K Showcase': 'premium4k',
};

let _catalog: Catalog | null = null;
let _catalogPromise: Promise<Catalog> | null = null;

// Active tier — set from the logged-in access code (App wires this).
// '' or 'full' => see everything; 'starter' => only starter channels.
let _activeTier = '';

export function setActiveTier(tier: string | null | undefined): void {
  _activeTier = (tier || '').toLowerCase();
}

export function getActiveTier(): string {
  return _activeTier;
}

/** ONE unified experience — no content tiers. Everyone sees every channel.
 *  "Plans" are flexible PAYMENT options (weekly/monthly/…), never content walls.
 *  (Kept as a function so all call-sites stay; it just never restricts now.) */
function isVisibleForTier(_ch: RawCatalogChannel): boolean {
  return true;
}

function streamIdFor(ch: RawCatalogChannel): number {
  if (ch.plays === 'direct') {
    // "free-1687" -> 901687, stable + collision-free with proxy ids.
    const n = parseInt(String(ch.ext_id).replace(/[^0-9]/g, ''), 10) || 0;
    return DIRECT_ID_BASE + n;
  }
  return parseInt(String(ch.ext_id), 10);
}

/** Build the playback URL for a catalog channel. */
export function buildCatalogUrl(
  ch: CatalogChannel,
  creds: { username: string; password: string } | null,
): string {
  if (ch.plays === 'direct') {
    return ch.url || '';
  }
  // proxy — needs creds. Favor hd720 (weak networks), never source/4K.
  const u = creds?.username || '';
  const p = creds?.password || '';
  return `${PROXY}/live?id=${ch.ext_id}&u=${encodeURIComponent(u)}&p=${encodeURIComponent(p)}&q=${DEFAULT_QUALITY}`;
}

interface GemChannel { id: string; name: string; url: string; logo?: string; district: string; }
const GEM_DISTRICT_TO_EXPERIENCE: Record<string, string> = {
  sports: 'Sports', movies: 'Movies', news: 'News', french: 'Français',
  african: 'African', kids: 'Kids', discover: 'Documentary', music: 'Entertainment',
};
// Cross-listing — a channel that genuinely fits more than one collection shows on each.
const GEM_CROSS_LIST: Record<string, string[]> = {
  'Trace Sports Stars': ['Entertainment'], // sports content + the Trace entertainment brand
  // Francophone-African free gems belong on the French shelf too (balanced priority)
  'Africanews French': ['Français'],
  'Espace TV': ['Français'],
  'Medi1TV Afrique': ['Français'],
  'Africa 24 English': ['Français'],
  'AfroLandTV': ['Français'],
  'A2i TV': ['Français'],
};

/**
 * Distribute the FREE gems evenly through a row instead of leaving them
 * clustered at the end. Premium channels keep their relative order; each free
 * channel is placed at an evenly-spaced slot (offset by half a gap so the very
 * first tile isn't free). Gentle reorder — no randomness, stable output.
 */
function balanceFreeChannels(list: CatalogChannel[]): CatalogChannel[] {
  const free = list.filter((c) => c.free);
  const rest = list.filter((c) => !c.free);
  if (free.length === 0 || rest.length === 0) return list;

  const total = list.length;
  const out: (CatalogChannel | null)[] = new Array(total).fill(null);
  const gap = total / free.length;

  for (let k = 0; k < free.length; k++) {
    let pos = Math.floor(gap * k + gap / 2);
    if (pos >= total) pos = total - 1;
    while (out[pos] !== null) pos = (pos + 1) % total; // next open slot
    out[pos] = free[k];
  }

  let ri = 0;
  for (let i = 0; i < total; i++) {
    if (out[i] === null) out[i] = rest[ri++];
  }
  return out as CatalogChannel[];
}

function buildCatalog(raw: RawCatalog, gems: GemChannel[] = []): Catalog {
  const channels: CatalogChannel[] = raw.channels.map((c) => ({
    ...c,
    stream_id: streamIdFor(c),
  }));

  const byExperience: Record<string, CatalogChannel[]> = {};
  const byStreamId = new Map<number, CatalogChannel>();
  const directUrlMap = new Map<number, string>();

  for (const ch of channels) {
    (byExperience[ch.experience] ||= []).push(ch);
    // Cross-reference: a channel that genuinely fits more than one shelf (a French
    // beIN feed → Sports + Français + World Cup) appears on EACH.
    for (const extra of (ch.cross || [])) {
      if (extra !== ch.experience) (byExperience[extra] ||= []).push(ch);
    }
    byStreamId.set(ch.stream_id, ch);
    if (ch.plays === 'direct' && ch.url) directUrlMap.set(ch.stream_id, ch.url);
  }

  // ── Merge the open-source FREE gems into the collections. No discrimination:
  // they sit in the experience rows next to premium, flagged for the green/FREE tag.
  let gid = 990000;
  for (const g of gems) {
    const experience = GEM_DISTRICT_TO_EXPERIENCE[g.district] || 'Entertainment';
    const ch: CatalogChannel = {
      id: g.id, ext_id: g.id, name: g.name, icon: g.logo || '', experience,
      bucket: g.district, tier: 'starter', collection: null, plays: 'direct',
      url: g.url, tested: true, free: true, stream_id: gid++,
    };
    (byExperience[experience] ||= []).push(ch);
    channels.push(ch);
    byStreamId.set(ch.stream_id, ch);
    directUrlMap.set(ch.stream_id, g.url);
    // a channel that fits more than one shelf appears on each
    for (const extra of (GEM_CROSS_LIST[g.name] || [])) {
      if (extra !== experience) (byExperience[extra] ||= []).push(ch);
    }
  }

  // ── Balance: the FREE gems are appended LAST, so they bunch up at the END of
  // every row ("stacked in the corner"). Gently weave them through each row at
  // even intervals so free + premium feel mixed — premium keeps its relative
  // order, free just gets spread out (a reorder, not a shuffle).
  for (const name of Object.keys(byExperience)) {
    byExperience[name] = balanceFreeChannels(byExperience[name]);
  }

  const wcIds = new Set(raw.collections?.worldcup || []);
  const worldcup = channels.filter((c) => c.collection === 'worldcup' || wcIds.has(c.id));

  return {
    version: raw.version,
    total: raw.total,
    experienceOrder: raw.experience_order,
    channels,
    byExperience,
    byStreamId,
    worldcup,
    directUrlMap,
  };
}

/** Load + cache the static catalog. Fetches /tivi-curated.json exactly once. */
export async function getCatalog(): Promise<Catalog> {
  if (_catalog) return _catalog;
  if (_catalogPromise) return _catalogPromise;
  _catalogPromise = Promise.all([
    fetch('/tivi-curated.json').then((r) => {
      if (!r.ok) throw new Error(`catalog fetch ${r.status}`);
      return r.json() as Promise<RawCatalog>;
    }),
    fetch('/streamore-gems.json').then((r) => (r.ok ? r.json() : { gems: [] })).catch(() => ({ gems: [] })),
  ])
    .then(([raw, gemsData]) => {
      _catalog = buildCatalog(raw as RawCatalog, (gemsData as { gems?: GemChannel[] }).gems || []);
      return _catalog;
    })
    .catch((e) => {
      console.error('[CATALOG] load failed:', e);
      // Empty catalog — app degrades gracefully (no channels) instead of crashing.
      _catalog = buildCatalog({
        version: 'empty', total: 0, tiers: { starter: 0, full: 0 },
        experience_order: [], experiences: {}, channels: [],
        experience_index: {}, collections: {},
      });
      return _catalog;
    });
  return _catalogPromise;
}

/** Synchronous accessor — null until getCatalog() has resolved once. */
export function getCatalogSync(): Catalog | null {
  return _catalog;
}

/** All channels for a curator experience id (e.g. "sports"), tier-gated. */
export function getByExperience(curatorId: string): CatalogChannel[] {
  const cat = _catalog;
  if (!cat) return [];
  // Find the display experience(s) that map to this curator id.
  const displayNames = Object.entries(EXPERIENCE_TO_CURATOR_ID)
    .filter(([, id]) => id === curatorId)
    .map(([display]) => display);

  let pool: CatalogChannel[] = [];
  for (const dn of displayNames) {
    pool = pool.concat(cat.byExperience[dn] || []);
  }

  // The "sports" experience also surfaces World Cup channels (pages pin them).
  if (curatorId === 'sports') {
    const seen = new Set(pool.map((c) => c.stream_id));
    for (const wc of cat.worldcup) {
      if (!seen.has(wc.stream_id) && wc.experience === 'World Cup') {
        seen.add(wc.stream_id);
        pool.push(wc);
      }
    }
  }

  return pool.filter(isVisibleForTier);
}

/** Featured collection (World Cup), tier-gated. */
export function getCollection(name: string): CatalogChannel[] {
  const cat = _catalog;
  if (!cat) return [];
  if (name === 'worldcup') return cat.worldcup.filter(isVisibleForTier);
  return [];
}

/** Map curator experience id -> display name (for ordering / labels). */
export function curatorIdToDisplay(curatorId: string): string | null {
  for (const [display, id] of Object.entries(EXPERIENCE_TO_CURATOR_ID)) {
    if (id === curatorId) return display;
  }
  return null;
}

// ── Player-side helpers: derive a channel's category + build category
//    playlists for vertical (up/down) category surfing in the player. ──

/** Runtime Channel shape the player consumes (matches HomePage.toChannel). */
export interface RuntimeChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category: string;
}

/** Turn a catalog channel into a runtime Channel ready for the player. */
export function catalogChannelToRuntime(
  ch: CatalogChannel,
  creds: { username: string; password: string } | null,
): RuntimeChannel {
  return {
    id: `live-${ch.stream_id}`,
    name: ch.name.replace(/\s+/g, ' ').trim(),
    url: buildCatalogUrl(ch, creds),
    logo: ch.icon,
    category: 'live',
  };
}

/**
 * Resolve the DISPLAY experience name of a currently-playing channel from its
 * runtime id ("live-<stream_id>"). Returns null if it isn't a catalog channel
 * (e.g. a free-HLS hello card) — caller should then skip category surfing.
 */
export function experienceForChannelId(channelId: string | null | undefined): string | null {
  const cat = _catalog;
  if (!cat || !channelId) return null;
  const m = /^live-(\d+)$/.exec(channelId);
  if (!m) return null;
  const sid = parseInt(m[1], 10);
  const ch = cat.byStreamId.get(sid);
  return ch?.experience ?? null;
}

/**
 * The ordered list of experience display names that actually have at least one
 * tier-visible channel — the surfable "category ring" for up/down swipes.
 */
function surfableExperiences(cat: Catalog): string[] {
  const order = cat.experienceOrder.length
    ? cat.experienceOrder
    : Object.keys(cat.byExperience);
  return order.filter((name) => (cat.byExperience[name] || []).some(isVisibleForTier));
}

/**
 * Given the current experience name and a direction, return the adjacent
 * category's display name + its tier-visible runtime channels (wrapping).
 * Returns null when category surfing isn't possible (no catalog, <2 categories,
 * or the current experience isn't in the ring).
 */
export function adjacentCategory(
  currentExperience: string | null,
  dir: 1 | -1,
  creds: { username: string; password: string } | null,
): { name: string; channels: RuntimeChannel[] } | null {
  const cat = _catalog;
  if (!cat || !currentExperience) return null;
  const ring = surfableExperiences(cat);
  if (ring.length < 2) return null;
  const idx = ring.indexOf(currentExperience);
  if (idx === -1) return null;
  const nextName = ring[(idx + dir + ring.length) % ring.length];
  const channels = (cat.byExperience[nextName] || [])
    .filter(isVisibleForTier)
    .map((ch) => catalogChannelToRuntime(ch, creds));
  if (channels.length === 0) return null;
  return { name: nextName, channels };
}

/** Accent color per experience (mirrors HomePage EXPERIENCE_ACCENT). */
export const EXPERIENCE_ACCENT: Record<string, string> = {
  'World Cup': '#22C55E',
  'Sports': '#22C55E',
  'Movies': '#9D4EDD',
  'Entertainment': '#C77DFF',
  'Français': '#3B82F6',
  'African': '#F97316',
  'Arabic': '#14B8A6',
  'Kids': '#EC4899',
  'News': '#EF4444',
  'Documentary': '#A78BFA',
  '4K Showcase': '#EAB308',
};

export function accentForExperience(name: string | null | undefined): string {
  return (name && EXPERIENCE_ACCENT[name]) || '#9D4EDD';
}

export { EXPERIENCE_TO_CURATOR_ID };
