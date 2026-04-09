import React, { useState, useEffect } from 'react';
import { NewsTicker } from './NewsTicker';
import { fetchNewsFeed } from '@/services/news-feed';
import type { NewsItem } from '@/services/news-feed';

/**
 * NewsArena — live news headlines for the News experience page.
 * BBC World + Africa interleaved. Self-contained data fetching.
 */
const NewsArena: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNewsFeed().then(feed => {
      if (!cancelled) setItems(feed);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative">
      {/* Red/warm news atmosphere */}
      <div className="absolute inset-0 -top-6 -bottom-4 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 45% at 40% 40%, rgba(239,68,68,0.04) 0%, transparent 65%)',
      }} />
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 px-4 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
          <h3 className="text-[15px] font-bold text-white/80">Live Headlines</h3>
          <span className="text-[9px] text-white/15">BBC World &middot; Africa</span>
        </div>
        <NewsTicker items={items} isLoading={loading} accent="rgba(239,68,68,0.3)" />
      </div>
    </div>
  );
};

export default NewsArena;
