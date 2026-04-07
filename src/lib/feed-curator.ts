// ── Feed Curator — interleaves Supabase, TMDB trending, and live moments ──
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { TMDB_GENRES } from '@/lib/tmdb-map.generated';
import { getTmdbMap } from '@/lib/xtream';

// ── Types ──────────────────────────────────────────────────────────────────

export type FeedCardType = 'newsletter' | 'announcement' | 'trending' | 'live_moment';

export interface CuratedFeedItem {
  id: string;
  title: string;
  body: string;
  type: FeedCardType;
  badge: string;
  imageUrl?: string;
  actionUrl?: string;
  navigateTo?: string;
  timestamp: string;
  /** Seed for fake reaction counts */
  reactionSeed: number;
  tmdbRating?: number;
  tmdbKey?: string;
}

export interface SupabaseFeedItem {
  id: string;
  title: string;
  subtitle: string | null;
  body_preview: string | null;
  feed_type: string | null;
  category: string | null;
  image_url: string | null;
  action_url: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
}

// ── TMDB genre ID → readable name ─────────────────────────────────────────

function genreLabel(ids: number[]): string {
  const names = ids
    .slice(0, 2)
    .map(id => TMDB_GENRES[id])
    .filter(Boolean);
  return names.join(' / ') || 'Movie';
}

// ── Generate trending cards from TMDB data ────────────────────────────────

export async function generateTmdbTrending(count = 5): Promise<CuratedFeedItem[]> {
  const data = await getTmdbMap();
  if (!data) return [];

  const entries = Object.entries(data.TMDB_MAP)
    .filter(([key, val]) => key.startsWith('m:') && val.r >= 7.5 && val.p)
    .sort((a, b) => b[1].r - a[1].r);

  // Deterministic daily shuffle so it feels fresh each day
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const shuffled = entries
    .map((entry, i) => ({ entry, sort: ((i * 2654435761 + dayOfYear) >>> 0) % entries.length }))
    .sort((a, b) => a.sort - b.sort)
    .map(x => x.entry);

  // Trending card copy variations — keeps the feed feeling editorial, not robotic
  const COPY = [
    (g: string, r: string) => ({ title: `${g} — ★ ${r}`, body: `Highly rated ${g.toLowerCase()} streaming now on TiVi+.` }),
    (g: string, r: string) => ({ title: `Top ${g} Pick`, body: `Rated ${r}/10 — a must-watch this week.` }),
    (g: string, r: string) => ({ title: `${g} You Shouldn't Miss`, body: `${r}/10 on TMDB. Stream it now.` }),
    (g: string, r: string) => ({ title: `Fresh ${g} — ${r}/10`, body: `Just landed. One of the highest rated this season.` }),
    (g: string, r: string) => ({ title: `★ ${r} ${g}`, body: `The community is watching this right now on TiVi+.` }),
  ];

  return shuffled.slice(0, count).map(([key, tmdb], i) => {
    const genre = genreLabel(tmdb.g);
    const rating = tmdb.r.toFixed(1);
    const copy = COPY[i % COPY.length](genre, rating);
    const runtime = tmdb.t ? `${Math.floor(tmdb.t / 60)}h ${tmdb.t % 60}m` : null;
    return {
      id: `tmdb-${key}`,
      title: copy.title,
      body: copy.body + (runtime ? ` ${runtime}.` : '') + (tmdb.y ? ' Trailer available.' : ''),
      type: 'trending' as const,
      badge: 'Trending',
      imageUrl: tmdb.p ? `https://image.tmdb.org/t/p/w500${tmdb.p}` : undefined,
      navigateTo: '/movies',
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      reactionSeed: Math.round(tmdb.r * 5.2),
      tmdbRating: tmdb.r,
      tmdbKey: tmdb.y,
    };
  });
}

// ── Curated backdrop images for live moment cards ───
const LIVE_BACKDROPS = {
  sports: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop&q=80',
  news: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&h=400&fit=crop&q=80',
  general: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&h=400&fit=crop&q=80',
};

export function generateLiveMoments(_channelIcons?: { sports?: string; news?: string; cinema?: string }, _tmdbPosters?: string[]): CuratedFeedItem[] {
  const hour = new Date().getHours();
  const items: CuratedFeedItem[] = [];

  // Sports windows
  if ((hour >= 12 && hour <= 16) || (hour >= 18 && hour <= 23)) {
    items.push({
      id: 'live-sports-' + Math.floor(Date.now() / 3600000),
      title: hour >= 18 ? 'Prime Time Sports — Live Now' : 'Live Sports on Air',
      body: hour >= 18
        ? 'Evening matches are happening. Tap to tune in.'
        : 'Afternoon sports block is on. Catch it live.',
      type: 'live_moment',
      badge: 'Live',
      imageUrl: LIVE_BACKDROPS.sports,
      navigateTo: '/live/sports',
      timestamp: new Date().toISOString(),
      reactionSeed: 28 + (hour % 10),
    });
  }

  // Late night cinema
  if (hour >= 22 || hour < 4) {
    items.push({
      id: 'live-cinema-' + Math.floor(Date.now() / 3600000),
      title: 'Late Night Cinema — 24/7',
      body: 'Cinema channels running all night. Dive in.',
      type: 'live_moment',
      badge: 'Live',
      imageUrl: LIVE_BACKDROPS.cinema,
      navigateTo: '/movies',
      timestamp: new Date().toISOString(),
      reactionSeed: 15,
    });
  }

  // Morning news
  if (hour >= 6 && hour < 10) {
    items.push({
      id: 'live-news-' + Math.floor(Date.now() / 3600000),
      title: 'Morning Briefing — Start Informed',
      body: 'World news channels are live. Stay sharp.',
      type: 'live_moment',
      badge: 'Live',
      imageUrl: LIVE_BACKDROPS.news,
      navigateTo: '/live/news',
      timestamp: new Date().toISOString(),
      reactionSeed: 12,
    });
  }

  // Default: always show at least one live card
  if (items.length === 0) {
    items.push({
      id: 'live-now-' + Math.floor(Date.now() / 3600000),
      title: 'Live Right Now',
      body: 'Thousands of channels streaming. What are you watching?',
      type: 'live_moment',
      badge: 'Live',
      imageUrl: LIVE_BACKDROPS.general,
      navigateTo: '/live',
      timestamp: new Date().toISOString(),
      reactionSeed: 20,
    });
  }

  return items;
}

// ── Map Supabase feed items to curated format ─────────────────────────────

function mapSupabaseItem(item: SupabaseFeedItem, fallbackPosters: string[]): CuratedFeedItem {
  const ft = item.feed_type || item.category || 'feed';
  let type: FeedCardType = 'newsletter';
  if (ft === 'announcement' || ft === 'feature') type = 'announcement';

  // Image: use provided, or pick a TMDB poster as visual backdrop
  let imageUrl = item.image_url && !item.image_url.includes('undefined') ? item.image_url : undefined;
  if (!imageUrl && fallbackPosters.length > 0) {
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
    imageUrl = fallbackPosters[Math.abs(hash) % fallbackPosters.length];
  }

  return {
    id: item.id,
    title: item.title,
    body: item.body_preview || item.subtitle || '',
    type,
    badge: ft === 'announcement' ? 'Announcement' : ft === 'netflix' ? 'Netflix' : ft === 'matchday' ? 'Matchday' : 'Update',
    imageUrl,
    actionUrl: item.action_url || undefined,
    timestamp: item.created_at,
    reactionSeed: Math.floor(Math.random() * 20) + 5,
  };
}

// ── Main curator — interleave all sources ─────────────────────────────────

export async function curateFeed(supabaseItems: SupabaseFeedItem[], channelIcons?: { sports?: string; news?: string; cinema?: string }): Promise<CuratedFeedItem[]> {
  const tmdbCards = await generateTmdbTrending(8);
  const liveMoments = generateLiveMoments();

  // Only show Supabase items that have images (no placeholders)
  const feedCards = supabaseItems
    .filter(item => item.image_url && !item.image_url.includes('undefined'))
    .map(item => mapSupabaseItem(item, []));

  // Interleave: live moments first (if any), then alternate feed + tmdb
  const result: CuratedFeedItem[] = [];

  // Live moments always go to the top
  result.push(...liveMoments);

  // Interleave feed_items and tmdb trending
  let fi = 0;
  let ti = 0;
  while (fi < feedCards.length || ti < tmdbCards.length) {
    if (fi < feedCards.length) result.push(feedCards[fi++]);
    if (fi < feedCards.length) result.push(feedCards[fi++]);
    if (ti < tmdbCards.length) result.push(tmdbCards[ti++]);
  }

  return result;
}
