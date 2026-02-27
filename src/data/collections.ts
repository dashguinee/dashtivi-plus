import type { Collection } from '@/types';
import rawCollections from './collections.json';

const raw = rawCollections as unknown as Record<
  string,
  {
    title: string;
    description: string;
    icon: string;
    type?: string;
    featured?: boolean;
    priority?: number;
    dynamic?: boolean;
    movies?: (number | string)[];
    series?: number[];
    filter?: Record<string, unknown>;
    keywords?: string[];
  }
>;

// Build collections array
export const allCollections: Collection[] = Object.entries(raw)
  .filter(([key]) => {
    // Skip user-specific and empty collections
    if (key === 'continue_watching' || key === 'my_list' || key === 'trending') return false;
    return true;
  })
  .map(([key, val]) => ({
    key,
    title: val.title,
    description: val.description,
    icon: val.icon,
    type: val.type,
    featured: val.featured,
    priority: val.priority,
    dynamic: val.dynamic,
    movies: val.movies || [],
    series: val.series || [],
    filter: val.filter as Collection['filter'],
    keywords: val.keywords,
  }))
  .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

export const featuredCollections = allCollections.filter((c) => c.featured);

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

// Collection color gradients (deterministic based on key)
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

// Collection icon mapping
const iconMap: Record<string, string> = {
  africa: '🌍',
  kids: '🧸',
  korea: '🇰🇷',
  superhero: '🦸',
  car: '🏎️',
  action: '🔫',
  magic: '🪄',
  spy: '🕵️',
  space: '⭐',
  horror: '👻',
  comedy: '😂',
  heart: '❤️',
  military: '⚔️',
  documentary: '🎬',
  india: '🇮🇳',
  turkey: '🇹🇷',
  netflix: '🎥',
  '4k': '📺',
  award: '🏆',
  download: '📥',
  trending: '🔥',
  france: '🇫🇷',
  free: '🆓',
};

export function getCollectionEmoji(icon: string): string {
  return iconMap[icon] || '🎬';
}
