import type { Channel } from '@/types';
import rawData from './africa_channels.json';
import iptvRaw from './iptv_channels.json';
import freeLiveRaw from './verified_streams.json';
import newSourcesRaw from './new_sources.json';

const data = rawData as {
  metadata: Record<string, unknown>;
  verified_channels: Channel[];
  guinea_channels: Channel[];
  senegal_channels: Channel[];
  ivory_coast_channels: Channel[];
  cameroon_channels: Channel[];
  south_africa_free: Channel[];
  international_french: Channel[];
  supersport: Channel[];
  supersport_backup: Channel[];
  supersport_hls: Channel[];
  bein_sports: Channel[];
  dstv_movies: Channel[];
  playlists: Record<string, string>;
  mena_cached: Array<{
    id: string;
    name: string;
    url: string;
    group: string;
    needsProxy: boolean;
  }>;
};

// Map MENA groups to our categories
function mapGroup(group: string): string {
  const g = group.toLowerCase();
  if (g.includes('news')) return 'news';
  if (g.includes('sport')) return 'sports';
  if (g.includes('kid') || g.includes('animation')) return 'kids';
  if (g.includes('music')) return 'music';
  if (g.includes('movie') || g.includes('series') || g.includes('classic')) return 'movies';
  if (g.includes('documentary') || g.includes('education')) return 'documentary';
  if (g.includes('religious')) return 'religious';
  if (g.includes('entertainment') || g.includes('comedy') || g.includes('family')) return 'entertainment';
  return 'general';
}

// Build unified channel list
function buildChannels(): Channel[] {
  const channels: Channel[] = [];
  const seen = new Set<string>();

  function add(ch: Channel, country?: string, category?: string) {
    if (seen.has(ch.id)) return;
    // Skip channels that need proxy (they won't play in browser)
    if (ch.needsProxy) return;
    seen.add(ch.id);
    channels.push({
      ...ch,
      country: ch.country || country || 'International',
      category: ch.category || category || 'general',
    });
  }

  // Priority: verified first (best quality)
  data.verified_channels.forEach((ch) => add(ch));

  // Guinea channels
  data.guinea_channels.forEach((ch) => add({ ...ch, country: 'Guinea', category: 'entertainment' }));

  // Senegal
  data.senegal_channels.forEach((ch) => add({ ...ch, country: 'Senegal', category: 'entertainment' }));

  // Ivory Coast
  data.ivory_coast_channels.forEach((ch) => add({ ...ch, country: 'Ivory Coast', category: 'entertainment' }));

  // South Africa
  data.south_africa_free.forEach((ch) => add({ ...ch, country: 'South Africa', category: 'entertainment' }));

  // MENA cached channels (biggest source - only non-proxy)
  data.mena_cached.forEach((ch) => {
    if (ch.needsProxy) return;
    add(
      {
        id: ch.id,
        name: ch.name,
        url: ch.url,
        group: ch.group,
      },
      'MENA',
      mapGroup(ch.group || '')
    );
  });

  // iptv-org channels (2400+ from global databases)
  const iptvChannels = iptvRaw as Array<{
    id: string;
    name: string;
    url: string;
    logo?: string;
    country?: string;
    category?: string;
    quality?: string;
    group?: string;
  }>;

  for (const ch of iptvChannels) {
    if (seen.has(ch.id)) continue;
    // Also dedupe by URL
    const urlKey = ch.url.split('?')[0]; // strip query params for dedup
    if (seen.has(urlKey)) continue;
    seen.add(ch.id);
    seen.add(urlKey);
    channels.push({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      country: ch.country || 'International',
      category: ch.category || 'general',
      quality: ch.quality,
      group: ch.group,
    });
  }

  // OG free live channels (3,041 hard-verified — actual HLS streaming confirmed)
  const freeChannels = freeLiveRaw as Array<{
    id: string;
    name: string;
    url: string;
    logo?: string;
    country?: string;
    category?: string;
    quality?: string;
    group?: string;
    source?: string;
    stream_type?: string;
  }>;

  for (const ch of freeChannels) {
    if (seen.has(ch.id)) continue;
    const urlKey = ch.url.split('?')[0];
    if (seen.has(urlKey)) continue;
    seen.add(ch.id);
    seen.add(urlKey);
    channels.push({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      country: ch.country || 'International',
      category: ch.category || 'general',
      quality: ch.quality,
      group: ch.group,
    });
  }

  // New sources: Free-TV, Pluto TV, Plex, Tubi, Roku (1,300+ verified alive)
  const newSources = newSourcesRaw as Array<{
    id: string;
    name: string;
    url: string;
    logo?: string;
    country?: string;
    category?: string;
    group?: string;
    source?: string;
  }>;

  for (const ch of newSources) {
    if (seen.has(ch.id)) continue;
    const urlKey = ch.url.split('?')[0];
    if (seen.has(urlKey)) continue;
    seen.add(ch.id);
    seen.add(urlKey);
    channels.push({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      country: ch.country || 'International',
      category: ch.category || mapGroup(ch.group || ''),
      group: ch.group || ch.source,
    });
  }

  return channels;
}

export const allChannels = buildChannels();

// Country list for UI
export const countries = [...new Set(allChannels.map((c) => c.country).filter(Boolean))] as string[];

// Category counts
export const categoryCounts = allChannels.reduce(
  (acc, ch) => {
    const cat = ch.category || 'general';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

// Get channels by category
export function getChannelsByCategory(category: string): Channel[] {
  if (category === 'all') return allChannels;
  if (category === 'africa') {
    return allChannels.filter((ch) =>
      [
        'Guinea', 'Senegal', 'Ivory Coast', 'Cameroon', 'South Africa', 'Nigeria',
        'Ghana', 'DRC', 'DR Congo', 'Mali', 'Burkina Faso', 'Benin', 'Togo',
        'Niger', 'Gabon', 'Congo', 'Kenya', 'Algeria', 'Morocco', 'Tunisia',
        'Egypt', 'Somalia', 'Chad',
      ].includes(ch.country || '')
    );
  }
  if (category === 'france') {
    return allChannels.filter((ch) => ch.country === 'France');
  }
  return allChannels.filter((ch) => ch.category === category);
}

// Get featured channels (high quality, non-proxy)
export function getFeaturedChannels(): Channel[] {
  const featured = allChannels.filter(
    (ch) => ch.quality && (ch.quality.includes('1080') || ch.quality.includes('720'))
  );
  // Return up to 5, shuffled
  return featured.sort(() => Math.random() - 0.5).slice(0, 5);
}

// Search channels
export function searchChannels(query: string): Channel[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return allChannels.filter(
    (ch) =>
      ch.name.toLowerCase().includes(q) ||
      (ch.country || '').toLowerCase().includes(q) ||
      (ch.category || '').toLowerCase().includes(q) ||
      (ch.group || '').toLowerCase().includes(q)
  );
}

// Get channel by ID
export function getChannelById(id: string): Channel | undefined {
  return allChannels.find((ch) => ch.id === id);
}

export const totalChannelCount = allChannels.length;
