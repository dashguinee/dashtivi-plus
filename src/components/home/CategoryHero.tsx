import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { t } from '@/i18n';
import type { Lang } from '@/i18n';
import type { CatalogChannel } from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';

/**
 * CategoryHero — the generalized cinematic hero, one per category.
 *
 * This is HomePage's WorldCupHero look, lifted out and tinted by a single
 * `accent` color. The edge glow, the LIVE dot, the accent text + the big play
 * pulse all derive from `accent`. Passing the World-Cup green (#22C55E) keeps
 * the exact original World Cup look (green radial wash, green border, green
 * play breathe) — it's the same recipe, just parameterized.
 *
 * Restraint = premium: ONE signature element (the slow accent light-sweep).
 * Same `channels[] + onPlay` shape WorldCupHero / NbaShowcase take.
 */

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

// Parse "#RRGGBB" → "r,g,b" so we can mix arbitrary alpha into the accent.
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

// A darker companion for the play-button gradient (shade ~ 0.62 of accent).
function shade(hex: string, factor = 0.62): string {
  const [r, g, b] = rgb(hex).split(',').map(Number);
  const f = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function CategoryHero({
  title,
  accent,
  channels,
  lang,
  onPlay,
  onSeeAll,
  rotateMs = 90000,
  lead,
}: {
  /** Display title (e.g. "World Cup", "Cinéma Live"). */
  title: string;
  /** Single signature color, e.g. EXPERIENCE_ACCENT[exp]. */
  accent: string;
  channels: CatalogChannel[];
  lang: Lang;
  /** Play the CURRENT featured channel, with the row as playlist context. */
  onPlay: (ch: CatalogChannel) => void;
  /** Optional "See all" → category page. */
  onSeeAll?: () => void;
  /** Auto-advance cadence in ms (default 90s — battery-light). */
  rotateMs?: number;
  /** Preferred channel to show FIRST (matched by name). */
  lead?: RegExp;
}) {
  // Reorder ONCE: pin the lead-matching channel to index 0, stable otherwise.
  const ordered = useMemo(() => {
    if (!lead) return channels;
    const i = channels.findIndex((c) => lead.test(c.name));
    if (i <= 0) return channels;
    const picked = channels[i];
    return [picked, ...channels.slice(0, i), ...channels.slice(i + 1)];
  }, [channels, lead]);

  const [idx, setIdx] = useState(0);
  const rootRef = useRef<HTMLButtonElement>(null);

  // Auto-rotation — cheap: one interval, paused when tab is hidden OR the hero
  // is scrolled off-screen (IntersectionObserver). No work when < 2 channels.
  useEffect(() => {
    if (ordered.length < 2) return;
    const el = rootRef.current;
    let timer: ReturnType<typeof setInterval> | null = null;
    let visible = true;

    const tick = () => {
      if (!document.hidden && visible) setIdx((i) => (i + 1) % ordered.length);
    };
    const start = () => {
      if (timer == null) timer = setInterval(tick, rotateMs);
    };
    const stop = () => {
      if (timer != null) { clearInterval(timer); timer = null; }
    };

    let observer: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      });
      observer.observe(el);
    } else {
      start();
    }

    return () => { stop(); observer?.disconnect(); };
  }, [ordered.length, rotateMs]);

  const featured = ordered[idx % ordered.length] || ordered[0];
  if (!featured) return null;

  const a = rgb(accent);
  const dark = shade(accent);
  // Stable per-instance keyframe names so multiple heros don't collide.
  const uid = accent.replace('#', '');

  return (
    <button
      ref={rootRef}
      onPointerDown={() => tap()}
      onClick={() => onPlay(featured)}
      className="relative w-full overflow-hidden rounded-2xl text-left active:scale-[0.99] transition-transform duration-200 group"
      style={{
        height: '22vh',
        minHeight: 158,
        maxHeight: 190,
        background:
          `radial-gradient(ellipse 90% 70% at 25% 20%, rgba(${a},0.22) 0%, transparent 60%), ` +
          'radial-gradient(ellipse 80% 80% at 90% 90%, rgba(10,12,16,0.6) 0%, transparent 70%), ' +
          'linear-gradient(160deg, #0a0e14 0%, #070a0d 55%, #050608 100%)',
        border: `1px solid rgba(${a},0.18)`,
        boxShadow: `0 0 40px rgba(${a},0.08), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <style>{`
        @keyframes hero-sweep-${uid} { 0%{transform:translateX(-40%)} 100%{transform:translateX(140%)} }
        @keyframes hero-play-breathe-${uid} {
          0%,100% { box-shadow: 0 0 22px rgba(${a},0.45); transform: scale(1); }
          50%     { box-shadow: 0 0 34px rgba(${a},0.70); transform: scale(1.06); }
        }
        @keyframes hero-marquee-in-${uid} { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* SIGNATURE — slow accent light-sweep, continuous */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-y-0 -left-1/3 w-2/3 opacity-70"
          style={{
            background: `linear-gradient(115deg, transparent 20%, rgba(${a},0.07) 46%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
            animation: `hero-sweep-${uid} 7s ease-in-out infinite`,
          }}
        />
      </div>

      {/* Cinema vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* Category pill — premium accent-tinted glass chip + quiet pulsing dot */}
      <div
        className="absolute top-4 left-4 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full"
        style={{
          background: `linear-gradient(180deg, rgba(${a},0.16), rgba(${a},0.07))`,
          border: `1px solid rgba(${a},0.32)`,
          boxShadow: `0 0 14px rgba(${a},0.14), inset 0 1px 0 rgba(255,255,255,0.07)`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: accent }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accent }} />
        </span>
        <span className="text-[10.5px] font-bold tracking-[1.5px] uppercase" style={{ color: accent }}>
          {title}
        </span>
      </div>

      {/* See all — top right */}
      {onSeeAll && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); tap(); onSeeAll(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 flex items-center gap-0.5 text-[11px] font-semibold tracking-wide px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
          style={{ background: `rgba(${a},0.16)`, border: `1px solid rgba(${a},0.4)`, color: accent }}
        >
          {t(lang, 'seeAll')}
          <ChevronRight className="w-3 h-3" />
        </span>
      )}

      {/* Marquee channel — bottom. The icon+name+count crossfade (one-shot
          fade-in, keyed on the featured channel) as auto-rotation advances. */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
        <div
          key={featured.stream_id}
          className="flex items-end gap-4 flex-1 min-w-0"
          style={{ animation: `hero-marquee-in-${uid} 0.5s ease-out` }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${a},0.25)` }}
          >
            <ChannelIcon src={featured.icon} name={featured.name} size="md" eager className="!w-14 !h-14" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[23px] leading-tight font-black text-white tracking-tight line-clamp-2">
              {cleanName(featured.name)}
            </h1>
            <p className="text-[12px] text-white/45 mt-0.5">
              {lang === 'fr'
                ? `${ordered.length} chaîne${ordered.length !== 1 ? 's' : ''} en direct`
                : `${ordered.length} channel${ordered.length !== 1 ? 's' : ''} live now`}
            </p>
          </div>
        </div>
        {/* Big play target */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${dark})`,
            animation: `hero-play-breathe-${uid} 2.8s ease-in-out infinite`,
          }}
        >
          <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
        </div>
      </div>
    </button>
  );
}
