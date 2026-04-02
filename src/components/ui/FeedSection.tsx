import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Flame, Heart, MessageCircle, ChevronDown, ChevronRight, ExternalLink,
  TrendingUp, Radio, Newspaper, Megaphone,
} from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { CuratedFeedItem, SupabaseFeedItem } from '@/lib/feed-curator';
import { curateFeed } from '@/lib/feed-curator';

// ── Constants ────────────────────────────────────────────────────────────────

const SB_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://mclbbkmpovnvcfmwsoqt.supabase.co').trim()}/rest/v1`;
const SB_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const CACHE_KEY = 'tivi_feed_curated';
const CACHE_TTL = 30 * 60 * 1000;
const REACTIONS_KEY = 'tivi_feed_reactions';

// ── Reactions — just OYÉ and LOVE ────────────────────────────────────────────

type ReactionType = 'oye' | 'love';

function getStoredReactions(): Record<string, Record<ReactionType, number>> {
  try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}'); } catch { return {}; }
}

function storeReaction(itemId: string, type: ReactionType) {
  const all = getStoredReactions();
  if (!all[itemId]) all[itemId] = { oye: 0, love: 0 };
  all[itemId][type]++;
  try { localStorage.setItem(REACTIONS_KEY, JSON.stringify(all)); } catch {}
  return all[itemId];
}

function getReactionCounts(itemId: string, seed: number): Record<ReactionType, number> {
  const stored = getStoredReactions()[itemId] || { oye: 0, love: 0 };
  return {
    oye: seed + stored.oye,
    love: Math.round(seed * 0.6) + stored.love,
  };
}

// ── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { color: string; Icon: typeof Flame }> = {
  trending:     { color: '#FF6B35', Icon: TrendingUp },
  live_moment:  { color: '#f87171', Icon: Radio },
  newsletter:   { color: '#c084fc', Icon: Newspaper },
  announcement: { color: '#22d3ee', Icon: Megaphone },
};

// ── Background gradients for non-poster cards ────────────────────────────────

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1a0533 0%, #0d0d1a 50%, #1a0533 100%)',
  'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
  'linear-gradient(135deg, #1c1017 0%, #0d0d1a 50%, #170d1c 100%)',
  'linear-gradient(135deg, #0d1a1a 0%, #0d0d1a 50%, #0d1a17 100%)',
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="flex gap-3 px-4 pb-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 rounded-2xl skeleton" style={{ width: 280, height: 180 }} />
      ))}
    </div>
  );
}

// ── Feed Card ────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: CuratedFeedItem }) {
  const { t } = useLanguage();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // accordion below card
  const [reactions, setReactions] = useState(() => getReactionCounts(item.id, item.reactionSeed));
  const [glowType, setGlowType] = useState<ReactionType | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const badge = BADGE_CONFIG[item.type] || BADGE_CONFIG.newsletter;
  const BadgeIcon = badge.Icon;
  const isTmdb = item.type === 'trending';
  const isLive = item.type === 'live_moment';
  const hasPoster = isTmdb && item.imageUrl;

  // Close overlay on outside click
  useEffect(() => {
    if (!overlayOpen) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOverlayOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [overlayOpen]);

  const handleCardTap = () => {
    if (!overlayOpen) setOverlayOpen(true);
  };

  const handleChevronTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  };

  const handleReaction = (type: ReactionType, e: React.MouseEvent) => {
    e.stopPropagation();
    storeReaction(item.id, type);
    setReactions(getReactionCounts(item.id, item.reactionSeed));
    setGlowType(type);
    setTimeout(() => setGlowType(null), 400);
  };

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.navigateTo) {
      window.location.href = item.navigateTo;
    } else if (item.actionUrl) {
      window.open(item.actionUrl, '_blank', 'noopener');
    } else {
      window.open('https://dasuperhub.com', '_blank', 'noopener');
    }
  };

  return (
    <div ref={cardRef} className="flex-shrink-0" style={{ width: 280, scrollSnapAlign: 'start' }}>
      {/* ── Main Card — tucked bottom edges ── */}
      <div
        className="relative overflow-hidden cursor-pointer select-none feed-card-hover"
        style={{
          height: 180,
          borderRadius: '16px 16px 24px 24px',
          clipPath: 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)',
        }}
        onClick={handleCardTap}
      >
        {/* Background */}
        {hasPoster ? (
          <img src={item.imageUrl} alt={item.title || 'Channel'} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0" style={{ background: getGradient(item.id) }}>
            {/* Subtle brand icon for non-poster cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
              <BadgeIcon className="w-20 h-20" />
            </div>
          </div>
        )}

        {/* Bottom gradient — black + subtle purple fade at the tucked edge */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
          height: '70%',
          background: 'linear-gradient(to top, rgba(10,5,20,0.95) 0%, rgba(10,5,20,0.7) 30%, rgba(0,0,0,0.4) 55%, transparent 100%)',
        }} />
        {/* Purple accent line at the tucked bottom */}
        <div className="absolute bottom-0 inset-x-[4%] h-[1px] pointer-events-none" style={{
          background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.15), transparent)',
        }} />

        {/* Default — title + badge + indicators */}
        {!overlayOpen && (
          <div className="absolute inset-0 flex flex-col justify-end p-3.5 z-[1]">
            <p className="text-[13px] font-semibold text-white/90 leading-tight line-clamp-2 mb-1.5">{item.title}</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: badge.color }}>
                  {isLive ? t('liveNow') : isTmdb ? t('trendingOnTivi') : 'UPDATE'}
                </span>
                {isLive && <span className="feed-live-dot" />}
              </span>
              <span className="flex items-center gap-2.5">
                <span className="flex items-center gap-0.5 text-white/20">
                  <Flame className="w-3 h-3" />
                  <span className="text-[9px] tabular-nums">{reactions.oye}</span>
                </span>
                <span className="flex items-center gap-0.5 text-white/20">
                  <Heart className="w-3 h-3" />
                  <span className="text-[9px] tabular-nums">{reactions.love}</span>
                </span>
              </span>
            </div>
          </div>
        )}

        {/* ── Overlay — tap 1: content details ── */}
        {overlayOpen && (
          <div className="absolute inset-0 z-[5] flex flex-col feed-overlay-slide-up" onClick={e => e.stopPropagation()}>
            {/* Top — blurred image peek (tap to close) */}
            <div
              className="h-[28%] flex-shrink-0 cursor-pointer"
              onClick={() => { setOverlayOpen(false); setExpanded(false); }}
              style={{ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
            />

            {/* Content panel */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3" style={{
              background: 'rgba(10,10,15,0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}>
              <p className="text-[13px] font-semibold text-white/95 leading-snug mb-1">{item.title}</p>
              <p className="text-[11px] text-white/50 leading-relaxed mb-2 line-clamp-3">{item.body}</p>

              {item.tmdbRating && (
                <span className="text-[10px] font-bold text-yellow-400/80">&#9733; {item.tmdbRating.toFixed(1)}</span>
              )}

              {/* CTA */}
              <button onClick={handleCTA}
                className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 rounded-full text-[10px] font-bold text-white/70 spring-press"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(157,78,221,0.25)' }}>
                <ExternalLink className="w-3 h-3" />
                {item.navigateTo ? t('watchOnTivi') : t('seeOnDash')}
              </button>

              {/* Chevron to expand reactions below */}
              <button onClick={handleChevronTap} className="flex justify-center w-full mt-2 spring-press">
                <ChevronDown className={`w-4 h-4 text-white/20 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Accordion — reactions + comments BELOW the card ── */}
      <div className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-soft-land ${expanded ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="rounded-2xl p-3.5" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Reaction pills — OYÉ and LOVE only */}
          <div className="flex gap-2 mb-3">
            {([
              { type: 'oye' as ReactionType, Icon: Flame, label: t('reactionOye') },
              { type: 'love' as ReactionType, Icon: Heart, label: t('reactionLove') },
            ]).map(({ type, Icon, label }) => (
              <button
                key={type}
                onClick={(e) => handleReaction(type, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold spring-press select-none transition-colors duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${
                  glowType === type ? 'text-white/90 feed-reaction-glow-anim' : 'text-white/35'
                }`} />
                <span className="text-white/50">{label}</span>
                <span className={`text-white/25 tabular-nums transition-transform duration-300 ${
                  glowType === type ? 'scale-125' : 'scale-100'
                }`}>{reactions[type]}</span>
              </button>
            ))}
          </div>

          {/* Comments area */}
          <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
            <p className="text-[10px] text-white/15 text-center py-3">{t('beFirstToReact')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Show More Card ───────────────────────────────────────────────────────────

function ShowMoreCard({ onTap }: { onTap: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer select-none flex flex-col items-center justify-center gap-2 spring-press"
      style={{
        width: 140, height: 180, scrollSnapAlign: 'start',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
      }}
      onClick={onTap}
    >
      <ChevronRight className="w-4 h-4 text-white/25" />
      <span className="text-[11px] font-medium text-white/25">{t('showMoreFeed')}</span>
    </div>
  );
}

// ── Main FeedSection ─────────────────────────────────────────────────────────

export const FeedSection: React.FC<{ className?: string }> = React.memo(({ className = '' }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<CuratedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL && cached.items?.length) {
          setItems(cached.items);
          setLoading(false);
          return;
        }
      }
    } catch {}

    const url = `${SB_URL}/feed_items?select=id,title,subtitle,body_preview,feed_type,category,image_url,action_url,icon,color,created_at&is_active=eq.true&order=created_at.desc&limit=10`;

    fetch(url, { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: SupabaseFeedItem[]) => mounted ? curateFeed(data || []) : null)
      .then(curated => {
        if (!mounted || !curated) return;
        setItems(curated);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ items: curated, ts: Date.now() })); } catch {}
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        curateFeed([]).then(curated => {
          if (!mounted) return;
          if (curated.length > 0) setItems(curated);
          else setError(true);
          setLoading(false);
        });
      });

    return () => { mounted = false; };
  }, []);

  // V1 LOCKDOWN: never return null — collapse to 0 height instead to prevent layout shift
  const isEmpty = !loading && (error || items.length === 0);

  const visible = showAll ? items : items.slice(0, 6);
  const hasMore = !showAll && items.length > 6;

  return (
    <section className={`transition-opacity duration-500 ${isEmpty ? 'opacity-0 h-0 overflow-hidden' : 'mb-2 py-3 reveal'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="feed-pulse-dot" />
          <h2 className="text-[20px] font-black tracking-tight text-white" style={{ textShadow: '0 0 40px rgba(157,78,221,0.08)' }}>
            {t('whatsHappening')}
          </h2>
        </div>
        <span className="text-[10px] text-white/15 uppercase tracking-wider font-medium">
          {t('fromCommunity')}
        </span>
      </div>

      {/* Horizontal scroll */}
      {loading ? <SkeletonCards /> : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth-x px-4 pb-3 items-start">
          {visible.map(item => (
            <FeedCard key={item.id} item={item} />
          ))}
          {hasMore && <ShowMoreCard onTap={() => setShowAll(true)} />}
        </div>
      )}
    </section>
  );
});
FeedSection.displayName = 'FeedSection';
