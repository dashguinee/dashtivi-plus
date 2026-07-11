import React, { memo } from 'react';
import type { TmdbEntry } from '@/lib/tmdb-map.generated';
import type { WallItem } from '@/lib/wall-shelves';
import { PosterCard } from '@/components/ui/PosterCard';
import { TMDB_GENRES } from '@/lib/movie-collections';
import { TMDB_TV_GENRES } from '@/lib/series-collections';
import { tap } from '@/lib/haptics';

/** Up to two human genre labels for a cover (movie or series map by kind). */
function genreNames(item: WallItem, tmdbMap: Record<string, TmdbEntry>): string[] {
  const entry = tmdbMap[`${item.kind === 'movie' ? 'm' : 's'}:${item.id}`];
  const ids = entry?.g;
  if (!ids || ids.length === 0) return [];
  const map = item.kind === 'series' ? TMDB_TV_GENRES : TMDB_GENRES;
  const out: string[] = [];
  for (const id of ids) {
    const name = map[id];
    if (name) out.push(name);
    if (out.length === 2) break;
  }
  return out;
}

/* ════════════════════════════════════════════════════════════════════
   WALL SHELF — one horizontal filmstrip of the cover-wall (v2).

   The strip is a flex row translated by translateX so flipping the cursor
   slides the covers left/right. v2 adds two things over v1:

   • WINDOWING — only ~cursor±RADIUS covers are mounted (a shelf can back
     thousands of items without exploding the DOM). The rendered window
     [start,end) is translated so global cover `cursor` lands at x=0:
     translateX = -((cursor - start) · stride) + peek.

   • VENDOR'S EYE — the ACTIVE shelf is full-bright; dimming/scaling of the
     neighbours happens in the parent stack. The "🔥 Ce soir" chip flags the
     freshest strip, and a live count badge signals the shelf's vastness.

   Covers are div[role=button] (NOT <button>) so useSwipeSurf — which ignores
   gestures that START on a real button/input — can lock a horizontal flip on
   them. PosterCard (a <button>) is rendered inside a pointer-events:none wrapper
   so it stays purely visual: the wrapping div owns the tap → onOpen, and the
   surf engine sees only the role=button div (not in its interactive selector).
   ════════════════════════════════════════════════════════════════════ */

const CARD_GAP = 14;
/** Covers mounted on each side of the cursor (windowing radius). */
const RADIUS = 16;

interface Props {
  items: WallItem[];
  cursor: number;
  tmdbMap: Record<string, TmdbEntry>;
  accent: string;
  label: string;
  active: boolean;
  cardWidth: number;
  /** Noun for the count badge — "films" or "séries". */
  noun?: string;
  /** Live rubber-band peek (px) while a horizontal gesture is in progress. */
  dragDx?: number;
  /** True once every category of this shelf is fully paged (count is exact). */
  exhausted?: boolean;
  /** Vendor's "🔥 Ce soir" accent — the freshest strip. */
  hot?: boolean;
  onOpen: (item: WallItem) => void;
  /** Mark this shelf active (e.g. on pointer-down) so the flip drives it. */
  onActivate?: () => void;
}

/** French thousands: 2431 → "2 431". */
function frCount(n: number): string {
  return n.toLocaleString('fr-FR');
}

export const WallShelf = memo(function WallShelf({
  items, cursor, tmdbMap, accent, label, active, cardWidth, noun = 'films', dragDx = 0,
  exhausted = false, hot = false, onOpen, onActivate,
}: Props) {
  const stride = cardWidth + CARD_GAP;
  // Clamp cursor into range so a flip past the end just rests on the last card.
  const maxCursor = Math.max(0, items.length - 1);
  const clamped = Math.min(Math.max(0, cursor), maxCursor);

  // Windowing: mount only the covers around the cursor.
  const start = Math.max(0, clamped - RADIUS);
  const end = Math.min(items.length, clamped + RADIUS + 1);
  const windowItems = items.slice(start, end);

  // Rubber-band peek only on the active shelf; damped so it feels weighted.
  const peek = active ? dragDx * 0.4 : 0;
  // Translate the (offset) window so global cover `clamped` sits at x=0.
  const translate = -((clamped - start) * stride) + peek;

  const countLabel = items.length > 0
    ? `${frCount(items.length)}${exhausted ? '' : '+'} ${noun}`
    : '…';

  return (
    <section
      className="relative select-none"
      onPointerDown={onActivate}
    >
      {/* Shelf header — accent dot + label + "🔥 Ce soir" + count badge */}
      <div className="flex items-center gap-2.5 px-5 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: accent, boxShadow: `0 0 7px ${accent}` }}
        />
        <h2 className="text-[19px] font-black tracking-tight text-white">{label}</h2>
        {hot && (
          <span
            className="text-[10px] font-black flex-shrink-0 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(52,211,153,0.14)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            🔥 Ce soir
          </span>
        )}
        <span
          className="text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-full ml-auto"
          style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}33` }}
        >
          {countLabel}
        </span>
      </div>

      {/* Filmstrip — one GPU-composited translate, no native scroll (surf drives it) */}
      <div className="overflow-hidden px-5">
        <div
          className={active ? 'flex items-end card-glow' : 'flex items-end'}
          style={{
            gap: CARD_GAP,
            transform: `translateX(${translate}px)`,
            transition: dragDx !== 0 ? 'none' : 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
            willChange: 'transform',
          }}
        >
          {windowItems.length === 0 ? (
            // Empty / still-loading shelf — skeleton strip, never a crash.
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex-shrink-0 rounded-xl"
                style={{ width: cardWidth, height: Math.round(cardWidth * 1.5), background: 'rgba(255,255,255,0.03)' }}
              />
            ))
          ) : (
            windowItems.map(item => {
              const genres = genreNames(item, tmdbMap);
              return (
                <div
                  key={`${item.kind}:${item.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={item.name}
                  onClick={() => { tap(); onOpen(item); }}
                  className="flex-shrink-0"
                  style={{ width: cardWidth }}
                >
                  {/* pointer-events:none keeps PosterCard's inner <button> from becoming
                      the gesture target, so the surf engine reads the role=button div. */}
                  <div className="relative" style={{ pointerEvents: 'none' }}>
                    <PosterCard
                      title={item.name}
                      poster={item.poster}
                      rating={item.rating}
                      tmdbData={tmdbMap[`${item.kind === 'movie' ? 'm' : 's'}:${item.id}`]}
                      onClick={() => {}}
                    />
                    {/* Series get a corner tag so a série reads apart from a film at a glance. */}
                    {item.kind === 'series' && (
                      <span
                        className="absolute top-1.5 left-1.5 text-[8.5px] font-black tracking-wider px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(10,10,14,0.78)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(2px)' }}
                      >
                        SÉRIE
                      </span>
                    )}
                  </div>
                  {/* Genre pills — replaces the redundant second title. */}
                  <div className="flex flex-wrap justify-center gap-1 mt-1.5 px-0.5" style={{ minHeight: 16 }}>
                    {genres.map(g => (
                      <span
                        key={g}
                        className="text-[8.5px] leading-none font-semibold text-white/55 px-1.5 py-[3px] rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
});
