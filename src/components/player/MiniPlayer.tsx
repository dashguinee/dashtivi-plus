import React, { useCallback, useRef } from 'react';
import { Play, X, Maximize2 } from 'lucide-react';
import type { Channel, PlayerState } from '@/types';
import { useAdjacentChannels, setCurrentChannel } from '@/lib/playlist';
import { useSwipeSurf } from '@/hooks/useSwipeSurf';

interface Props {
  state: PlayerState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onClose: () => void;
  onExpand: () => void;
  /** Swipe-surf in the mini card → play the adjacent channel (live only). */
  onSurf?: (channel: Channel) => void;
  visible: boolean;
  /** Shared position (fixed left/top) — kept in App so the <video> tracks it. */
  pos: { x: number; y: number };
  /** Has the user dragged it yet? (controls drop-in transition). */
  dragged: boolean;
  /** Report a new dragged position up to App (applied to both card + video). */
  onMove: (pos: { x: number; y: number }) => void;
  /** Card pixel size — for viewport clamping while dragging. */
  cardW: number;
  cardH: number;
}

/** Format seconds into H:MM:SS or M:SS */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const MiniPlayer: React.FC<Props> = ({
  state,
  onTogglePlay,
  onClose,
  onExpand,
  onSurf,
  visible,
  pos,
  dragged,
  onMove,
  cardW,
  cardH,
}) => {
  const category = state.channel?.category?.toLowerCase() ?? '';
  const isVod = category === 'movie' || category === 'series';

  // New-era remote inside the mini card — swipe to surf channels (live only).
  // The card's buttons are <button>, so the hook ignores gestures that start
  // on them; a horizontal swipe across the card body surfs.
  const { prev: adjPrev, next: adjNext } = useAdjacentChannels();
  const surf = useCallback((ch: Channel) => {
    setCurrentChannel(ch.id);
    onSurf?.(ch);
  }, [onSurf]);
  const surfHandlers = useSwipeSurf({
    enabled: !isVod && !!onSurf,
    onPrev: adjPrev ? () => surf(adjPrev) : undefined,
    onNext: adjNext ? () => surf(adjNext) : undefined,
    // Mini card is small — a shorter throw feels right.
    threshold: 44,
  });

  // Tap-to-expand coexists with swipe-surf: the surf hook ignores gestures that
  // start on a <button>, so the expand surface must NOT be a button. Instead we
  // track pointer movement and only treat a release as a "tap → expand" when the
  // pointer barely moved (a swipe-surf moves far and is ignored here).
  const tapRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const onTapDown = useCallback((e: React.PointerEvent) => {
    tapRef.current = { x: e.clientX, y: e.clientY, moved: false };
    surfHandlers.onPointerDown(e);
  }, [surfHandlers]);
  const onTapMove = useCallback((e: React.PointerEvent) => {
    const t = tapRef.current;
    if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10) t.moved = true;
    surfHandlers.onPointerMove(e);
  }, [surfHandlers]);
  const onTapUp = useCallback((e: React.PointerEvent) => {
    surfHandlers.onPointerUp(e);
  }, [surfHandlers]);
  const handleExpandTap = useCallback(() => {
    if (!tapRef.current?.moved) onExpand();
  }, [onExpand]);

  // ── Drag-to-move (search-pebble pattern) ───────────────────────────────
  // Lives on a dedicated grip handle (marked data-no-surf so swipe-surf ignores
  // gestures that start on it). Pointer-capture + a tap-vs-drag threshold; the
  // card is clamped fully inside the viewport. Position is reported up to App so
  // the persistent <video> moves with it as one unit.
  const DRAG_SLOP = 6;
  const dragRef = useRef<{ offX: number; offY: number; moved: boolean } | null>(null);
  const clampX = useCallback((x: number) => Math.max(6, Math.min(window.innerWidth - cardW - 6, x)), [cardW]);
  const clampY = useCallback((y: number) => Math.max(56, Math.min(window.innerHeight - cardH - 8, y)), [cardH]);

  const onGripDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { offX: e.clientX - pos.x, offY: e.clientY - pos.y, moved: false };
  }, [pos.x, pos.y]);
  const onGripMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = e.clientX - d.offX, ny = e.clientY - d.offY;
    if (!d.moved && Math.hypot(nx - pos.x, ny - pos.y) > DRAG_SLOP) d.moved = true;
    if (d.moved) onMove({ x: clampX(nx), y: clampY(ny) });
  }, [pos.x, pos.y, onMove, clampX, clampY]);
  const onGripUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  }, []);

  if (!state.channel || !visible) return null;

  return (
    // Same fixed box as the persistent <video> in App.tsx (z-[41] chrome over the
    // z-40 video). Position comes from the SHARED `pos` so card + video align 1:1
    // while dragging. Slide-in only on first appearance (not while repositioning).
    <div
      className={`fixed z-[41] w-72 sm:w-80 aspect-video ${dragged ? '' : 'animate-slide-up'}`}
      style={{ left: pos.x, top: pos.y, transition: dragged ? 'none' : undefined }}
    >
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden neon-primary shadow-2xl shadow-black/50 ring-1 ring-white/10"
        onPointerDown={onTapDown}
        onPointerMove={onTapMove}
        onPointerUp={onTapUp}
        onPointerCancel={surfHandlers.onPointerCancel}
      >
        {/* Drag-to-move handle — top strip (data-no-surf so swipe-surf ignores it).
            Buttons sit above it (z-20); the grip pill hints it's draggable. */}
        <div
          data-no-surf
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
          className="absolute top-0 inset-x-0 z-10 h-7 flex items-start justify-center pt-1 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          aria-label="Move player"
        >
          <span className="w-8 h-1 rounded-full bg-white/40" />
        </div>
        {/* Tap-to-expand surface — sits over the (transparent) video area. Not a
            button so swipe-surf still reads gestures that start here. */}
        <div
          className="absolute inset-0 z-0 cursor-pointer"
          onClick={handleExpandTap}
          aria-label="Expand player"
        />

        {/* Top scrim + controls — play/pause, expand, close, overlaid compactly. */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-end gap-1 p-1.5 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none">
          {!state.isPlaying && (
            <button
              onClick={onTogglePlay}
              aria-label="Play"
              className="pointer-events-auto w-8 h-8 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center hover:bg-primary/45 transition-colors"
            >
              <Play className="w-4 h-4 text-primary-light ml-0.5" />
            </button>
          )}
          <button
            onClick={onExpand}
            aria-label="Expand"
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white/90" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-4 h-4 text-white/90" />
          </button>
        </div>

        {/* Bottom scrim — channel name + LIVE/VOD time/Buffering status. */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-2.5 pt-6 pb-2 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none">
          <h4 className="text-xs font-semibold text-white truncate drop-shadow">{state.channel.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isVod ? (
              <span className="text-[10px] text-white/80 font-mono">
                {formatTime(state.currentTime)}
                {state.duration > 0 && ` / ${formatTime(state.duration)}`}
              </span>
            ) : (
              <>
                <span className="live-pulse !w-1.5 !h-1.5" />
                <span className="text-[10px] text-success font-semibold tracking-wide">LIVE</span>
              </>
            )}
            {state.isLoading && (
              <span className="text-[10px] text-warning">Buffering...</span>
            )}
          </div>
        </div>

        {/* Progress bar — actual progress for VOD, animated pulse for live. */}
        <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-black/30 pointer-events-none">
          {isVod && state.duration > 0 ? (
            <div
              className="h-full w-full origin-left bg-primary transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform"
              style={{ transform: `scaleX(${Math.max(0, Math.min(1, state.duration > 0 ? state.currentTime / state.duration : 0))})` }}
            />
          ) : (
            <div className="h-full bg-primary w-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
