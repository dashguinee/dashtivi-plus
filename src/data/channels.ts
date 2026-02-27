import type { Channel } from '@/types';
import verifiedRaw from './health_verified.json';

// Health-verified channels: 7,028 channels tested alive with HLS manifest OK
// Run `node scripts/health-check.cjs --fast` to refresh this data

type VerifiedChannel = {
  id: string;
  name: string;
  url: string;
  logo?: string;
  country?: string;
  category?: string;
  group?: string;
  quality?: string;
  latency?: number;
  hasManifest?: boolean;
};

const verified = verifiedRaw as VerifiedChannel[];

// Build channel list from health-verified data
function buildChannels(): Channel[] {
  const seen = new Set<string>();

  return verified
    .filter((ch) => {
      // Dedupe by URL (strip query params)
      const urlKey = ch.url.split('?')[0];
      if (seen.has(urlKey)) return false;
      seen.add(urlKey);
      return true;
    })
    .map((ch) => ({
      id: ch.id,
      name: ch.name,
      url: ch.url,
      logo: ch.logo,
      country: ch.country || 'International',
      category: ch.category || 'general',
      group: ch.group,
      quality: ch.quality,
    }));
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

// Get featured channels (lowest latency = fastest loading)
export function getFeaturedChannels(): Channel[] {
  // Already sorted by latency from health checker, take first 5
  return allChannels.slice(0, 5);
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
