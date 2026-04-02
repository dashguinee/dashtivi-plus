import React, { useEffect, useState } from 'react';
import { ExternalLink, ChevronRight, Newspaper, Star, Zap, Radio, Megaphone } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedItem {
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

interface FeedCarouselProps {
  className?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SB_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim()}/rest/v1`;
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const CACHE_KEY = 'tivi_feed_items';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Badge colors by feed_type / category
const BADGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  announcement: { bg: 'rgba(157,78,221,0.2)', text: 'rgba(192,132,252,0.9)', label: 'Announcement' },
  recommendation: { bg: 'rgba(249,115,22,0.2)', text: 'rgba(251,146,60,0.9)', label: 'Recommended' },
  matchday: { bg: 'rgba(239,68,68,0.2)', text: 'rgba(248,113,113,0.9)', label: 'Matchday' },
  feature: { bg: 'rgba(6,182,212,0.2)', text: 'rgba(34,211,238,0.9)', label: 'Feature' },
  DROP: { bg: 'rgba(249,115,22,0.2)', text: 'rgba(251,146,60,0.9)', label: 'New Drop' },
  netflix: { bg: 'rgba(229,9,20,0.2)', text: 'rgba(229,9,20,0.9)', label: 'Netflix' },
  updates: { bg: 'rgba(157,78,221,0.2)', text: 'rgba(192,132,252,0.9)', label: 'Update' },
  gameseal: { bg: 'rgba(6,182,212,0.2)', text: 'rgba(34,211,238,0.9)', label: 'Gaming' },
};

function getBadge(item: FeedItem) {
  // Try feed_type first, then category
  return BADGE_CONFIG[item.feed_type || '']
    || BADGE_CONFIG[item.category || '']
    || { bg: 'rgba(157,78,221,0.15)', text: 'rgba(192,132,252,0.8)', label: item.feed_type || 'Feed' };
}

function getBadgeIcon(item: FeedItem) {
  const cat = item.category || '';
  const ft = item.feed_type || '';
  if (cat === 'netflix' || ft === 'DROP') return <Star className="w-2.5 h-2.5" />;
  if (cat === 'gameseal') return <Zap className="w-2.5 h-2.5" />;
  if (ft === 'matchday') return <Radio className="w-2.5 h-2.5" />;
  if (ft === 'announcement' || cat === 'updates') return <Megaphone className="w-2.5 h-2.5" />;
  return <Newspaper className="w-2.5 h-2.5" />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Cache helpers ────────────────────────────────────────────────────────────

interface CachedData {
  items: FeedItem[];
  ts: number;
}

function getCached(): FeedItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachedData = JSON.parse(raw);
    if (Date.now() - data.ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data.items;
  } catch {
    return null;
  }
}

function setCache(items: FeedItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() }));
  } catch {
    // localStorage full — ignore
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 pb-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{
            width: 280,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Image skeleton */}
          <div className="skeleton w-full h-[120px]" />
          {/* Content skeleton */}
          <div className="p-3 space-y-2">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-4 w-[85%] rounded" />
            <div className="skeleton h-3 w-[60%] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  const badge = getBadge(item);
  const icon = getBadgeIcon(item);
  const hasImage = item.image_url && !item.image_url.includes('undefined');

  const handleClick = () => {
    if (item.action_url) {
      window.open(item.action_url, '_blank', 'noopener');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 rounded-xl overflow-hidden text-left card-press hover:scale-[1.03] active:scale-[0.97] group"
      style={{
        width: 280,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Image */}
      {hasImage ? (
        <div className="relative w-full h-[120px] overflow-hidden">
          <img
            src={item.image_url!}
            alt={item.title || 'Content'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Color accent overlay from item color */}
          {item.color && (
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{ background: `linear-gradient(135deg, ${item.color}, transparent)` }}
            />
          )}
        </div>
      ) : (
        <div
          className="relative w-full h-[72px] flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${item.color || '#9D4EDD'}12, rgba(255,255,255,0.02))`,
          }}
        >
          <Newspaper className="w-6 h-6 text-white/10" />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Badge + time */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
            style={{ background: badge.bg, color: badge.text }}
          >
            {icon}
            {badge.label}
          </span>
          <span className="text-[9px] text-white/25">{timeAgo(item.created_at)}</span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-white/90 leading-tight line-clamp-2">
          {item.title}
        </p>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-[11px] text-white/30 font-medium">{item.subtitle}</p>
        )}

        {/* Body preview */}
        {item.body_preview && (
          <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
            {item.body_preview}
          </p>
        )}
      </div>
    </button>
  );
}

// ── "See More" end card ──────────────────────────────────────────────────────

function SeeMoreCard() {
  return (
    <a
      href="https://dasuperhub.com"
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 card-press hover:scale-[1.03] active:scale-[0.97] group"
      style={{
        width: 200,
        minHeight: 180,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* DASH Logo text */}
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-[22px] font-black tracking-tight text-white uppercase"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          DASH
        </span>
      </div>

      <p className="text-[11px] text-white/30 font-medium text-center px-4 leading-snug">
        More content on<br />dasuperhub.com
      </p>

      {/* Arrow circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{
          background: 'rgba(157,78,221,0.12)',
          border: '1px solid rgba(157,78,221,0.2)',
          boxShadow: '0 0 12px rgba(157,78,221,0.08)',
        }}
      >
        <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white/90 transition-colors" />
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        <ExternalLink className="w-3 h-3 text-white/20" />
        <span className="text-[9px] text-white/20 tracking-wider uppercase font-semibold">See more on DASH</span>
      </div>
    </a>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const FeedCarousel: React.FC<FeedCarouselProps> = React.memo(({ className = '' }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Try cache first
    const cached = getCached();
    if (cached && cached.length > 0) {
      setItems(cached);
      setLoading(false);
      return;
    }

    // Fetch from Supabase REST API
    const url = `${SB_URL}/feed_items?select=id,title,subtitle,body_preview,feed_type,category,image_url,action_url,icon,color,created_at&is_active=eq.true&order=created_at.desc&limit=10`;

    fetch(url, {
      headers: {
        apikey: SB_ANON,
        Authorization: `Bearer ${SB_ANON}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: FeedItem[]) => {
        if (!mounted) return;
        if (data && data.length > 0) {
          setItems(data);
          setCache(data);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Don't render anything if no items and not loading
  if (!loading && (error || items.length === 0)) return null;

  return (
    <section className={`mb-2 py-3 reveal ${className}`}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-baseline gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full mb-0.5"
            style={{
              background: '#9D4EDD',
              boxShadow: '0 0 6px rgba(157,78,221,0.4)',
            }}
          />
          <h2
            className="text-[20px] font-black tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(157,78,221,0.08)' }}
          >
            DASH Feed
          </h2>
        </div>
        <a
          href="https://dasuperhub.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          dasuperhub.com
        </a>
      </div>

      {/* Cards row */}
      {loading ? (
        <SkeletonCards />
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade scroll-smooth-x px-4 pb-3">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
          <SeeMoreCard />
        </div>
      )}
    </section>
  );
});
FeedCarousel.displayName = 'FeedCarousel';
