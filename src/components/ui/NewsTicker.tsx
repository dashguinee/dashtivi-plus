import React, { useState, useEffect } from 'react';
import type { NewsItem } from '@/services/news-feed';
import { click as hapticClick } from '@/lib/haptics';

/**
 * NewsTicker — horizontal scroll news cards.
 * Reusable across Sports (ESPN), News (BBC), and any experience.
 * Cards show image + headline + source. Tap opens article overlay.
 */

interface Props {
  items: NewsItem[];
  isLoading: boolean;
  label?: string;
  accent?: string; // hex color for accent
}

function NewsTickerInner({ items, isLoading, label = 'Headlines', accent = 'rgba(255,255,255,0.15)' }: Props) {
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-[200px] h-[90px] rounded-lg bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2" data-haptic="lush">
        {items.map((item, i) => (
          <button
            key={item.id}
            className="flex-shrink-0 w-[200px] rounded-lg overflow-hidden text-left card-press active:scale-[0.97]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              animation: i < 10 ? `vee-card-in 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both` : undefined,
            }}
            onClick={() => { hapticClick(); setActiveArticle(item); }}
          >
            {item.image ? (
              <img src={item.image} alt="" className="w-full h-[70px] object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-[50px]" style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}03)` }} />
            )}
            <div className="p-2">
              <p className="text-[10px] text-white/60 font-medium leading-snug line-clamp-2">{item.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[7px] text-white/20 font-medium">{item.source}</span>
                <span className="text-[7px] text-white/15">{timeAgo(item.published)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Article overlay — bottom sheet */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setActiveArticle(null)}
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl overflow-hidden"
            style={{ background: '#0A0A0A', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="text-[10px] text-white/30 font-medium">{activeArticle.source} &middot; {timeAgo(activeArticle.published)}</span>
              <button onClick={() => setActiveArticle(null)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 text-lg">&times;</button>
            </div>
            {/* Image */}
            {activeArticle.image && (
              <img src={activeArticle.image} alt="" className="w-full h-[180px] object-cover" />
            )}
            {/* Content */}
            <div className="p-4">
              <h2 className="text-[15px] font-bold text-white/90 leading-snug mb-2">{activeArticle.title}</h2>
              <p className="text-[12px] text-white/40 leading-relaxed mb-4">{activeArticle.description}</p>
              <a
                href={activeArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Read full article &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export const NewsTicker = React.memo(NewsTickerInner);
export default NewsTicker;
