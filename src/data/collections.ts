import type { Channel, Collection, ChannelFilter } from '@/types';
import { allChannels } from './channels';

// ─── African Countries List ────────────────────────────────────
const AFRICAN_COUNTRIES = [
  'Guinea', 'Senegal', 'Ivory Coast', 'Cameroon', 'South Africa', 'Nigeria',
  'Ghana', 'DRC', 'DR Congo', 'Mali', 'Burkina Faso', 'Benin', 'Togo',
  'Niger', 'Gabon', 'Congo', 'Kenya', 'Algeria', 'Morocco', 'Tunisia',
  'Egypt', 'Somalia', 'Chad', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia',
  'Mozambique', 'Zimbabwe', 'Zambia', 'Angola', 'Libya', 'Sudan',
];

const LATIN_AMERICAN_COUNTRIES = [
  'Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru',
  'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay',
];

const ARABIC_GROUP_TERMS = [
  'Arabic', 'Arab', 'Iraq', 'Qatar', 'UAE', 'Egypt', 'Saudi',
  'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Syria', 'Palestine',
];

// ─── Smart Collection Definitions ──────────────────────────────

const collectionDefs: Omit<Collection, 'movies' | 'series'>[] = [
  // ─── FEATURED (priority 1-5) ──────────────────────────────
  {
    key: 'african_channels',
    title: 'African Channels',
    description: 'Live TV from across Africa — Guinea, Senegal, Nigeria, South Africa & more',
    icon: 'africa',
    type: 'region',
    featured: true,
    priority: 1,
    dynamic: true,
    channelFilter: {
      countries: AFRICAN_COUNTRIES,
    },
    keywords: ['africa', 'guinea', 'senegal', 'nigeria', 'cameroon', 'ghana', 'kenya', 'south africa'],
  },
  {
    key: 'sports_central',
    title: 'Sports Central',
    description: 'Live sports from around the world — football, basketball, cricket & more',
    icon: 'sports',
    type: 'genre',
    featured: true,
    priority: 2,
    dynamic: true,
    channelFilter: {
      categories: ['sports'],
      groupIncludes: ['Sport', 'sport', 'ESPN', 'SuperSport', 'beIN'],
    },
    keywords: ['sports', 'football', 'soccer', 'basketball', 'cricket', 'tennis', 'live sport'],
  },
  {
    key: 'news_247',
    title: 'News 24/7',
    description: 'Breaking news and live coverage from CNN, BBC, Al Jazeera & more',
    icon: 'news',
    type: 'genre',
    featured: true,
    priority: 3,
    dynamic: true,
    channelFilter: {
      categories: ['news'],
      groupIncludes: ['News', 'news', 'CNN', 'BBC News', 'Jazeera'],
    },
    keywords: ['news', 'breaking', 'live news', 'cnn', 'bbc', 'al jazeera', 'fox news'],
  },
  {
    key: 'kids_zone',
    title: 'Kids Zone',
    description: 'Safe, fun channels for children — cartoons, education & family entertainment',
    icon: 'kids',
    type: 'genre',
    featured: true,
    priority: 4,
    dynamic: true,
    channelFilter: {
      categories: ['kids'],
      groupIncludes: ['Kid', 'kid', 'Animation', 'Cartoon', 'Nickelodeon', 'Disney'],
    },
    keywords: ['kids', 'children', 'cartoon', 'animation', 'disney', 'nickelodeon', 'family'],
  },
  {
    key: 'hd_quality',
    title: 'HD Quality',
    description: 'Crystal clear streams in 720p and 1080p — the best viewing experience',
    icon: 'hd',
    type: 'quality',
    featured: true,
    priority: 5,
    dynamic: true,
    channelFilter: {
      qualities: ['1080', '720'],
    },
    keywords: ['hd', 'high definition', '1080p', '720p', 'quality', 'crystal clear'],
  },

  // ─── BY REGION ─────────────────────────────────────────────
  {
    key: 'french_channels',
    title: 'French Channels',
    description: 'TV from France — TF1, France 2, Canal+, M6 & more French-language content',
    icon: 'france',
    type: 'region',
    priority: 10,
    dynamic: true,
    channelFilter: {
      countries: ['France'],
      groupIncludes: ['France', 'france', 'French', 'FR:'],
    },
    keywords: ['france', 'french', 'tf1', 'canal', 'france 2', 'francais'],
  },
  {
    key: 'uk_channels',
    title: 'UK Channels',
    description: 'British television — BBC, ITV, Sky, Channel 4 & more from the United Kingdom',
    icon: 'uk',
    type: 'region',
    priority: 11,
    dynamic: true,
    channelFilter: {
      countries: ['UK', 'United Kingdom'],
      groupIncludes: ['UK', 'UK:', 'British', 'England'],
    },
    keywords: ['uk', 'british', 'bbc', 'itv', 'sky', 'channel 4', 'england'],
  },
  {
    key: 'usa_channels',
    title: 'USA Channels',
    description: 'American TV — ABC, CBS, NBC, Fox & local stations across the United States',
    icon: 'usa',
    type: 'region',
    priority: 12,
    dynamic: true,
    channelFilter: {
      countries: ['USA', 'US', 'United States'],
      groupIncludes: ['USA', 'US_LOCAL', 'US:', 'American'],
    },
    keywords: ['usa', 'american', 'abc', 'cbs', 'nbc', 'fox', 'us local'],
  },
  {
    key: 'turkish_tv',
    title: 'Turkish TV',
    description: 'Turkish television — TRT, Star TV, ATV & popular Turkish channels',
    icon: 'turkey',
    type: 'region',
    priority: 13,
    dynamic: true,
    channelFilter: {
      countries: ['Turkey'],
      groupIncludes: ['Turkey', 'Turkish', 'TR:'],
    },
    keywords: ['turkey', 'turkish', 'trt', 'dizi', 'turk'],
  },
  {
    key: 'indian_channels',
    title: 'Indian Channels',
    description: 'Indian television — Hindi, Tamil, Telugu & regional language channels',
    icon: 'india',
    type: 'region',
    priority: 14,
    dynamic: true,
    channelFilter: {
      countries: ['India'],
      groupIncludes: ['India', 'Indian', 'Hindi', 'Tamil', 'Telugu', 'IN:'],
    },
    keywords: ['india', 'indian', 'hindi', 'bollywood', 'tamil', 'telugu', 'star plus'],
  },
  {
    key: 'latin_america',
    title: 'Latin America',
    description: 'TV from Brazil, Mexico, Argentina & across Latin America',
    icon: 'latam',
    type: 'region',
    priority: 15,
    dynamic: true,
    channelFilter: {
      countries: LATIN_AMERICAN_COUNTRIES,
      groupIncludes: ['Brazil', 'Mexico', 'Argentina', 'Latin', 'Latino', 'Latina'],
    },
    keywords: ['latin', 'brazil', 'mexico', 'argentina', 'spanish', 'portuguese', 'novela'],
  },
  {
    key: 'arabic_channels',
    title: 'Arabic Channels',
    description: 'Arabic TV from the Middle East and North Africa — MBC, Rotana, Al Jazeera & more',
    icon: 'arabic',
    type: 'region',
    priority: 16,
    dynamic: true,
    channelFilter: {
      groupIncludes: ARABIC_GROUP_TERMS,
    },
    keywords: ['arabic', 'arab', 'mbc', 'rotana', 'al jazeera', 'qatar', 'saudi', 'uae', 'iraq'],
  },
  {
    key: 'german_tv',
    title: 'German TV',
    description: 'German television — ARD, ZDF, RTL, SAT.1 & more from Germany',
    icon: 'germany',
    type: 'region',
    priority: 17,
    dynamic: true,
    channelFilter: {
      countries: ['Germany'],
      groupIncludes: ['Germany', 'German', 'DE:', 'Deutsch'],
    },
    keywords: ['germany', 'german', 'ard', 'zdf', 'rtl', 'sat1', 'deutsch'],
  },
  {
    key: 'italian_tv',
    title: 'Italian TV',
    description: 'Italian television — RAI, Mediaset, Sky Italia & more from Italy',
    icon: 'italy',
    type: 'region',
    priority: 18,
    dynamic: true,
    channelFilter: {
      countries: ['Italy'],
      groupIncludes: ['Italy', 'Italian', 'IT:', 'Italiano'],
    },
    keywords: ['italy', 'italian', 'rai', 'mediaset', 'sky italia', 'italiano'],
  },

  // ─── BY GENRE ──────────────────────────────────────────────
  {
    key: 'music_channels',
    title: 'Music Channels',
    description: 'Music 24/7 — MTV, VH1, music videos & live performances',
    icon: 'music',
    type: 'genre',
    priority: 20,
    dynamic: true,
    channelFilter: {
      categories: ['music'],
      groupIncludes: ['Music', 'music', 'MTV', 'VH1'],
    },
    keywords: ['music', 'mtv', 'vh1', 'songs', 'concerts', 'live music'],
  },
  {
    key: 'entertainment',
    title: 'Entertainment',
    description: 'Entertainment channels — drama, reality TV, talk shows & variety',
    icon: 'entertainment',
    type: 'genre',
    priority: 21,
    dynamic: true,
    channelFilter: {
      categories: ['entertainment'],
    },
    keywords: ['entertainment', 'drama', 'reality', 'talk show', 'variety'],
  },
  {
    key: 'documentary',
    title: 'Documentary',
    description: 'Documentaries — National Geographic, Discovery, history & science',
    icon: 'documentary',
    type: 'genre',
    priority: 22,
    dynamic: true,
    channelFilter: {
      categories: ['documentary'],
      groupIncludes: ['Documentary', 'documentary', 'Discovery', 'National Geographic', 'History'],
    },
    keywords: ['documentary', 'discovery', 'national geographic', 'history', 'science', 'nature'],
  },
  {
    key: 'religious',
    title: 'Religious',
    description: 'Faith-based channels — Islamic, Christian & spiritual content',
    icon: 'religious',
    type: 'genre',
    priority: 23,
    dynamic: true,
    channelFilter: {
      categories: ['religious'],
      groupIncludes: ['Religious', 'religious', 'Islam', 'Christian', 'Church'],
    },
    keywords: ['religious', 'faith', 'islam', 'christian', 'spiritual', 'quran', 'prayer'],
  },
  {
    key: 'movies_series',
    title: 'Movies & Series',
    description: 'Movie and series channels — film premieres, classics & binge-worthy shows',
    icon: 'movie',
    type: 'genre',
    priority: 24,
    dynamic: true,
    channelFilter: {
      categories: ['movies', 'series'],
      groupIncludes: ['Movie', 'movie', 'Series', 'series', 'Film', 'Cinema'],
    },
    keywords: ['movies', 'series', 'film', 'cinema', 'shows', 'binge'],
  },
  {
    key: 'lifestyle_travel',
    title: 'Lifestyle & Travel',
    description: 'Lifestyle, travel, food & wellness channels from around the world',
    icon: 'lifestyle',
    type: 'genre',
    priority: 25,
    dynamic: true,
    channelFilter: {
      categories: ['lifestyle'],
      groupIncludes: ['Lifestyle', 'lifestyle', 'Travel', 'Food', 'Cooking'],
    },
    keywords: ['lifestyle', 'travel', 'food', 'cooking', 'wellness', 'home'],
  },

  // ─── SPECIAL ───────────────────────────────────────────────
  {
    key: '4k_ultra_hd',
    title: '4K Ultra HD',
    description: 'The ultimate viewing experience — 4K resolution channels',
    icon: '4k',
    type: 'quality',
    priority: 30,
    dynamic: true,
    channelFilter: {
      qualities: ['4K', '4k', '2160'],
    },
    keywords: ['4k', 'ultra hd', 'uhd', '2160p', 'highest quality'],
  },
  {
    key: 'pluto_tv',
    title: 'Pluto TV',
    description: 'Free streaming from Pluto TV — hundreds of live channels',
    icon: 'free',
    type: 'service',
    priority: 31,
    dynamic: true,
    channelFilter: {
      groupIncludes: ['Pluto', 'pluto', 'PLUTO'],
    },
    keywords: ['pluto', 'pluto tv', 'free streaming', 'pluto channels'],
  },
  {
    key: 'samsung_tv_plus',
    title: 'Samsung TV Plus',
    description: 'Free channels from Samsung TV Plus — news, entertainment & more',
    icon: 'free',
    type: 'service',
    priority: 32,
    dynamic: true,
    channelFilter: {
      groupIncludes: ['Samsung', 'samsung', 'SAMSUNG'],
    },
    keywords: ['samsung', 'samsung tv plus', 'samsung channels', 'free'],
  },
  {
    key: 'plex_channels',
    title: 'Plex Channels',
    description: 'Free live TV from Plex — curated channels across genres',
    icon: 'free',
    type: 'service',
    priority: 33,
    dynamic: true,
    channelFilter: {
      groupIncludes: ['Plex', 'plex', 'PLEX'],
    },
    keywords: ['plex', 'plex channels', 'plex tv', 'free'],
  },
  {
    key: 'roku_channels',
    title: 'Roku Channels',
    description: 'Free channels from The Roku Channel — movies, news & live TV',
    icon: 'free',
    type: 'service',
    priority: 34,
    dynamic: true,
    channelFilter: {
      groupIncludes: ['Roku', 'roku', 'ROKU'],
    },
    keywords: ['roku', 'roku channel', 'roku tv', 'free'],
  },
];

// ─── Build Collections Array ───────────────────────────────────

export const allCollections: Collection[] = collectionDefs
  .map((def) => ({
    ...def,
    movies: [] as (number | string)[],
    series: [] as number[],
  }))
  .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

export const featuredCollections = allCollections.filter((c) => c.featured);

// ─── Channel Filtering Engine ──────────────────────────────────

/**
 * Resolves a collection to actual live channels using its channelFilter.
 *
 * Filter logic:
 * - Within the same field (e.g. multiple countries), criteria are OR'd
 * - For region-type collections: countries and groupIncludes are OR'd together
 *   (a channel matches if it matches ANY country OR ANY group term)
 * - For non-region collections: different fields are AND'd
 *   (a channel must match categories AND qualities, etc.)
 * - categories and groupIncludes are OR'd together for genre collections
 *   (match category OR group term)
 */
export function getCollectionChannels(collection: Collection): Channel[] {
  const cf = collection.channelFilter;
  if (!cf) return [];

  const isRegion = collection.type === 'region';
  const isGenre = collection.type === 'genre';
  const isService = collection.type === 'service';
  const isQuality = collection.type === 'quality';

  return allChannels.filter((ch) => {
    const chCountry = (ch.country || '').toLowerCase();
    const chCategory = (ch.category || '').toLowerCase();
    const chGroup = (ch.group || '').toLowerCase();
    const chQuality = (ch.quality || '').toLowerCase();
    const chName = (ch.name || '').toLowerCase();

    // ── Region collections: country OR group match ──
    if (isRegion) {
      const countryMatch = cf.countries
        ? cf.countries.some((c) => chCountry === c.toLowerCase())
        : false;
      const groupMatch = cf.groupIncludes
        ? cf.groupIncludes.some((g) => chGroup.includes(g.toLowerCase()))
        : false;
      const nameMatch = cf.nameIncludes
        ? cf.nameIncludes.some((n) => chName.includes(n.toLowerCase()))
        : false;
      return countryMatch || groupMatch || nameMatch;
    }

    // ── Genre collections: category OR group match ──
    if (isGenre) {
      const categoryMatch = cf.categories
        ? cf.categories.some((c) => chCategory === c.toLowerCase())
        : false;
      const groupMatch = cf.groupIncludes
        ? cf.groupIncludes.some((g) => chGroup.includes(g.toLowerCase()))
        : false;
      const nameMatch = cf.nameIncludes
        ? cf.nameIncludes.some((n) => chName.includes(n.toLowerCase()))
        : false;
      return categoryMatch || groupMatch || nameMatch;
    }

    // ── Service collections: group match ──
    if (isService) {
      const groupMatch = cf.groupIncludes
        ? cf.groupIncludes.some((g) => chGroup.includes(g.toLowerCase()))
        : false;
      const nameMatch = cf.nameIncludes
        ? cf.nameIncludes.some((n) => chName.includes(n.toLowerCase()))
        : false;
      return groupMatch || nameMatch;
    }

    // ── Quality collections: quality match ──
    if (isQuality) {
      if (cf.qualities) {
        return cf.qualities.some((q) => chQuality.includes(q.toLowerCase()));
      }
      return false;
    }

    // ── Fallback: AND across fields, OR within fields ──
    const checks: boolean[] = [];

    if (cf.countries && cf.countries.length > 0) {
      checks.push(cf.countries.some((c) => chCountry === c.toLowerCase()));
    }
    if (cf.categories && cf.categories.length > 0) {
      checks.push(cf.categories.some((c) => chCategory === c.toLowerCase()));
    }
    if (cf.groupIncludes && cf.groupIncludes.length > 0) {
      checks.push(cf.groupIncludes.some((g) => chGroup.includes(g.toLowerCase())));
    }
    if (cf.qualities && cf.qualities.length > 0) {
      checks.push(cf.qualities.some((q) => chQuality.includes(q.toLowerCase())));
    }
    if (cf.nameIncludes && cf.nameIncludes.length > 0) {
      checks.push(cf.nameIncludes.some((n) => chName.includes(n.toLowerCase())));
    }

    return checks.length > 0 && checks.every(Boolean);
  });
}

// ─── Lookup Helpers ────────────────────────────────────────────

export function getCollectionByKey(key: string): Collection | undefined {
  return allCollections.find((c) => c.key === key);
}

export function searchCollections(query: string): Collection[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return allCollections.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.keywords || []).some((k) => k.toLowerCase().includes(q))
  );
}

/**
 * Returns the number of live channels that match a collection's filter.
 */
export function getCollectionChannelCount(key: string): number {
  const collection = getCollectionByKey(key);
  if (!collection) return 0;
  return getCollectionChannels(collection).length;
}

// ─── Visual Helpers ────────────────────────────────────────────

const gradients = [
  'from-purple-900 to-indigo-900',
  'from-rose-900 to-pink-900',
  'from-amber-900 to-orange-900',
  'from-emerald-900 to-teal-900',
  'from-blue-900 to-cyan-900',
  'from-violet-900 to-purple-900',
  'from-red-900 to-rose-900',
  'from-sky-900 to-blue-900',
  'from-lime-900 to-green-900',
  'from-fuchsia-900 to-pink-900',
];

export function getCollectionGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

const iconMap: Record<string, string> = {
  africa: '\u{1F30D}',
  sports: '\u{26BD}',
  news: '\u{1F4F0}',
  kids: '\u{1F9F8}',
  hd: '\u{1F4FA}',
  france: '\u{1F1EB}\u{1F1F7}',
  uk: '\u{1F1EC}\u{1F1E7}',
  usa: '\u{1F1FA}\u{1F1F8}',
  turkey: '\u{1F1F9}\u{1F1F7}',
  india: '\u{1F1EE}\u{1F1F3}',
  latam: '\u{1F30E}',
  arabic: '\u{1F54C}',
  germany: '\u{1F1E9}\u{1F1EA}',
  italy: '\u{1F1EE}\u{1F1F9}',
  music: '\u{1F3B5}',
  entertainment: '\u{1F3AD}',
  documentary: '\u{1F3AC}',
  religious: '\u{1F54A}\u{FE0F}',
  movie: '\u{1F3A5}',
  lifestyle: '\u{2708}\u{FE0F}',
  '4k': '\u{1F4FA}',
  free: '\u{1F193}',
};

export function getCollectionEmoji(icon: string): string {
  return iconMap[icon] || '\u{1F3AC}';
}
