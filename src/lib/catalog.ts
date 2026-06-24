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
const DEFAULT_QUALITY = 'hd720';

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
  'France': 'french',
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

/** Is a channel visible for the active tier? Full sees all; Starter sees starter-only. */
function isVisibleForTier(ch: RawCatalogChannel): boolean {
  if (_activeTier === 'starter') return ch.tier === 'starter';
  return true; // full / unknown / guest → everything
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
  sports: 'Sports', movies: 'Movies', news: 'News', french: 'France',
  african: 'African', kids: 'Kids', discover: 'Documentary', music: 'Entertainment',
};
// Cross-listing — a channel that genuinely fits more than one collection shows on each.
const GEM_CROSS_LIST: Record<string, string[]> = {
  'Trace Sports Stars': ['Entertainment'], // sports content + the Trace entertainment brand
};

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

export { EXPERIENCE_TO_CURATOR_ID };
