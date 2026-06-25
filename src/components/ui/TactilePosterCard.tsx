import React from 'react';
import { Play, Plus, Heart, Clapperboard, Info, Share2 } from 'lucide-react';
import {
  useTactileGestures,
  type TactileAction,
  TACTILE_VIOLET as VIOLET,
  TACTILE_SEAL as SEAL,
} from '@/hooks/useTactileGestures';

/* ════════════════════════════════════════════════════════════════════
   TactilePosterCard — "Motion as identity." (Movies poster adapter.)

   The gesture ENGINE now lives in @/hooks/useTactileGestures — this file is
   the Movies-specific skin that maps the generic layer onto a poster:

   • SWIPE L → Hide (fling off-left + fade, then collapse the slot).
   • SWIPE R → Watch Later (fling right + confirm pulse, then settle).
   • LONG-PRESS → lift + blur + radial menu: ▶ ＋ ❤ 🎬 ℹ 🔗.
   • Behaviour & FEEL are identical to before (engine preserves the constants).
   ════════════════════════════════════════════════════════════════════ */

const GOLD = '#E8C170';

interface Props {
  children: React.ReactNode;        // the poster visual (e.g. a PosterCard)
  width: number;                    // card width in px (for commit math)
  isFavorite?: boolean;
  isWatchLater?: boolean;
  actions: {
    onPlay: () => void;
    onWatchLater: () => void;
    onFavorite: () => void;
    onTrailer: () => void;
    onDetails: () => void;
    onShare: () => void;
    onHide: () => void;
  };
  /** Notified when THIS card grabs/releases — drives cluster drift in the parent. */
  onActiveChange?: (active: boolean) => void;
  labels?: { later: string; hidden: string };
}

export const TactilePosterCard: React.FC<Props> = ({
  children,
  width,
  isFavorite,
  isWatchLater,
  actions,
  onActiveChange,
  labels = { later: '＋ Watch Later', hidden: 'Hidden' },
}) => {
  const [removed, setRemoved] = React.useState(false);

  // The six-action radial menu — the Movies action set.
  const ACTIONS: TactileAction[] = [
    { id: 'play', label: 'Play', icon: <Play className="w-5 h-5" fill="currentColor" />, color: VIOLET, onFire: actions.onPlay },
    { id: 'later', label: 'Watch Later', icon: <Plus className="w-5 h-5" />, color: GOLD, onFire: actions.onWatchLater },
    { id: 'favorite', label: 'Favorite', icon: <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />, color: '#FF5C8A', onFire: actions.onFavorite },
    { id: 'trailer', label: 'Trailer', icon: <Clapperboard className="w-5 h-5" />, color: '#7FC8FF', onFire: actions.onTrailer },
    { id: 'details', label: 'Details', icon: <Info className="w-5 h-5" />, color: '#C9A8FF', onFire: actions.onDetails },
    { id: 'share', label: 'Share', icon: <Share2 className="w-5 h-5" />, color: '#9AE6B4', onFire: actions.onShare },
  ];

  const g = useTactileGestures({
    width,
    actions: ACTIONS,
    onSwipeRight: actions.onWatchLater,      // fling right → Watch Later
    onSwipeLeft: () => { setRemoved(true); actions.onHide(); }, // fling left → hide + collapse
    onActiveChange,
    flingOnSwipe: true,                      // posters fling off the table
    enabled: !removed,
  });

  const fadeOnHide = g.phase === 'flung-left' ? 0 : 1;

  if (removed) {
    return <div style={{ width, height: 0, transition: 'height 0.3s ease', overflow: 'hidden' }} />;
  }

  return (
    <>
      {g.overlay}

      <div
        ref={g.surfaceRef}
        className="relative select-none touch-none"
        style={{
          width,
          zIndex: g.lifted ? 70 : g.dragging || g.fling ? 40 : 'auto',
          touchAction: 'pan-y',
        }}
        {...g.handlers}
      >
        {/* The card body — the one thing the finger moves. */}
        <div
          style={{
            transform: g.bodyTransform,
            transition: g.bodyTransition,
            opacity: fadeOnHide,
            willChange: 'transform',
            borderRadius: 14,
            boxShadow: g.lifted
              ? `0 28px 60px rgba(8,4,16,0.7), 0 0 0 1px ${VIOLET}66, 0 0 44px ${VIOLET}55`
              : g.dragging
              ? `0 14px 36px rgba(8,4,16,0.5), 0 0 0 1px rgba(157,78,221,0.25)`
              : 'none',
          }}
        >
          {children}

          {/* Swipe-intent overlays — gold "＋ Watch Later" right, seal "Hidden" left. */}
          {g.dragging && g.dx > 4 && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[14px] pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${GOLD}26)`, opacity: g.commitT }}
            >
              <span
                className="px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide"
                style={{
                  color: SEAL, background: GOLD,
                  transform: `scale(${0.8 + g.commitT * 0.25})`,
                  boxShadow: `0 4px 18px ${GOLD}88`,
                }}
              >
                {labels.later}
              </span>
            </div>
          )}
          {g.dragging && g.dx < -4 && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-[14px] pointer-events-none"
              style={{ background: `linear-gradient(270deg, transparent, rgba(26,15,46,0.55))`, opacity: g.commitT }}
            >
              <span
                className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(20,12,34,0.8)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  transform: `scale(${0.8 + g.commitT * 0.2})`,
                }}
              >
                {labels.hidden}
              </span>
            </div>
          )}

          {/* Persistent state tick — tiny gold dot if already on Watch Later. */}
          {isWatchLater && !g.dragging && !g.lifted && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TactilePosterCard;
