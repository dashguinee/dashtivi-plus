import React, { memo } from 'react';
import type { VodStream } from '@/lib/xtream';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import { PosterCard } from '@/components/ui/PosterCard';
import { tap } from '@/lib/haptics';

/* ════════════════════════════════════════════════════════════════════
   WALL SHELF — one horizontal filmstrip of the cover-wall.

   The strip is a flex row translated by translateX(-cursor · cardStride):
   flipping the cursor slides the covers left/right. The ACTIVE shelf is
   full-bright; the rest dim so the eye reads which strip the swipe drives.

   Covers are div[role=button] (NOT <button>) so useSwipeSurf — which ignores
   gestures that START on a real button/input — can lock a horizontal flip on
   them. PosterCard (a <button>) is rendered inside a pointer-events:none wrapper
   so it stays purely visual: the wrapping div owns the tap → onOpen, and the
   surf engine sees only the role=button div (not in its interactive selector).
   ════════════════════════════════════════════════════════════════════ */

const CARD_GAP = 14;

interface Props {
  items: VodStream[];
  cursor: number;
  tmdbMap: Record<string, TmdbEntry>;
  accent: string;
  label: string;
  active: boolean;
  cardWidth: number;
  /** Live rubber-band peek (px) while a horizontal gesture is in progress. */
  dragDx?: number;
  onOpen: (movie: VodStream) => void;
  /** Mark this shelf active (e.g. on pointer-down) so the flip drives it. */
  onActivate?: () => void;
}

export const WallShelf = memo(function WallShelf({
  items, cursor, tmdbMap, accent, label, active, cardWidth, dragDx = 0, onOpen, onActivate,
}: Props) {
  // v1: cap at first 500 — no virtualization/infinite-scroll.
  const capped = items.slice(0, 500);
  const stride = cardWidth + CARD_GAP;
  const cardHeight = Math.round(cardWidth * 1.5);
  // Clamp cursor into range so a flip past the end just rests on the last card.
  const maxCursor = Math.max(0, capped.length - 1);
  const clamped = Math.min(Math.max(0, cursor), maxCursor);
  // Rubber-band peek only on the active shelf; damped so it feels weighted.
  const peek = active ? dragDx * 0.4 : 0;
  const translate = -(clamped * stride) + peek;

  return (
    <section
      className="relative select-none"
      onPointerDown={onActivate}
      style={{ opacity: active ? 1 : 0.55, transition: 'opacity 0.35s cubic-bezier(0.16,1,0.3,1)' }}
    >
      {/* Shelf header — accent dot + label + count badge */}
      <div className="flex items-center gap-2.5 px-5 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: accent, boxShadow: `0 0 7px ${accent}` }}
        />
        <h2 className="text-[19px] font-black tracking-tight text-white">{label}</h2>
        <span
          className="text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-full"
          style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}33` }}
        >
          {capped.length}
        </span>
      </div>

      {/* Filmstrip — one GPU-composited translate, no native scroll (surf drives it) */}
      <div className="overflow-hidden px-5">
        <div
          className="flex items-end"
          style={{
            gap: CARD_GAP,
            transform: `translateX(${translate}px)`,
            transition: dragDx !== 0 ? 'none' : 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
            willChange: 'transform',
          }}
        >
          {capped.map(movie => (
            <div
              key={movie.stream_id}
              role="button"
              tabIndex={0}
              aria-label={movie.name}
              onClick={() => { tap(); onOpen(movie); }}
              className="flex-shrink-0 card-glow"
              style={{ width: cardWidth }}
            >
              {/* pointer-events:none keeps PosterCard's inner <button> from becoming
                  the gesture target, so the surf engine reads the role=button div. */}
              <div style={{ pointerEvents: 'none' }}>
                <PosterCard
                  title={movie.name}
                  poster={movie.stream_icon}
                  rating={movie.rating}
                  tmdbData={tmdbMap[`m:${movie.stream_id}`]}
                  onClick={() => {}}
                />
              </div>
              <p className="text-[10.5px] leading-tight text-white/55 text-center mt-1.5 px-0.5 line-clamp-1 font-medium tracking-tight">
                {movie.name.replace(/\s*\(\d{4}\)\s*$/, '')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
