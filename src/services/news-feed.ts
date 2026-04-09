/**
 * News Feed Service — BBC RSS for world/Africa news, ESPN for sports.
 * BBC RSS is free, no API key, CORS-friendly via proxy.
 * ESPN already in sports-data.ts — this handles general news.
 */

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  published: string;
  link: string;
  source: string;
}

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://stream.zionsynapse.online').trim();

const BBC_FEEDS: Record<string, string> = {
  world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  africa: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  tech: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
};

const NEWS_CACHE_TTL = 20 * 60 * 1000; // 20 min

function getCached<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl) { localStorage.removeItem(key); return null; }
    return data as T;
  } catch { return null; }
}

function setCache(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function parseRssItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      || block.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
      || block.match(/<description>(.*?)<\/description>/)?.[1] || '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
      || block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const image = block.match(/url="(https:\/\/ichef[^"]+)"/)?.[1] || '';

    if (title) {
      items.push({
        id: link || String(items.length),
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"'),
        description: desc.replace(/<[^>]+>/g, '').slice(0, 120),
        image,
        published: pubDate,
        link,
        source,
      });
    }
  }
  return items;
}

export async function fetchBBCNews(category: 'world' | 'africa' | 'business' | 'tech' = 'world'): Promise<NewsItem[]> {
  const cacheKey = `news-bbc-${category}`;
  const cached = getCached<NewsItem[]>(cacheKey, NEWS_CACHE_TTL);
  if (cached) return cached;

  try {
    // BBC RSS might be CORS-blocked from browser — proxy through VPS
    const feedUrl = BBC_FEEDS[category];
    const res = await fetch(`${PROXY}/?url=${encodeURIComponent(feedUrl)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`BBC ${res.status}`);
    const xml = await res.text();
    const items = parseRssItems(xml, `BBC ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    setCache(cacheKey, items);
    return items;
  } catch (err) {
    console.warn(`[news-feed] BBC ${category} failed:`, err);
    return [];
  }
}

// Combined feed: Africa first (primary market), then world
export async function fetchNewsFeed(): Promise<NewsItem[]> {
  const [africa, world] = await Promise.all([
    fetchBBCNews('africa'),
    fetchBBCNews('world'),
  ]);
  // Interleave: africa, world, africa, world...
  const combined: NewsItem[] = [];
  const maxLen = Math.max(africa.length, world.length);
  for (let i = 0; i < maxLen && combined.length < 20; i++) {
    if (i < africa.length) combined.push(africa[i]);
    if (i < world.length) combined.push(world[i]);
  }
  return combined;
}
