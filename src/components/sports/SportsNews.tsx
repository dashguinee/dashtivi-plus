import React from 'react';
import type { NewsHeadline } from '@/services/sports-data';

interface Props {
  headlines: NewsHeadline[];
  isLoading: boolean;
}

function SportsNewsInner({ headlines, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-[260px] h-[140px] rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!headlines.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2" data-haptic="lush">
      {headlines.map((article, i) => (
        <div
          key={article.id}
          className="flex-shrink-0 w-[260px] rounded-xl overflow-hidden card-press active:scale-[0.97] cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: i < 8 ? `vee-card-in 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 100}ms both` : undefined,
          }}
          onClick={() => article.link && window.open(article.link, '_blank')}
        >
          {article.image && (
            <div className="w-full h-[100px] overflow-hidden">
              <img
                src={article.image}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="p-3">
            <p className="text-[11px] text-white/70 font-medium leading-snug line-clamp-2">
              {article.headline}
            </p>
            <p className="text-[9px] text-white/20 mt-1.5">
              {timeAgo(article.published)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const SportsNews = React.memo(SportsNewsInner);
export default SportsNews;
