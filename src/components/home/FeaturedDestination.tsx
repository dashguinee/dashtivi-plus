import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Lang } from '@/i18n';
import type { Catalog, CatalogChannel } from '@/lib/catalog';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { tap } from '@/lib/haptics';

/**
 * FeaturedDestination — a rotating "gateway" hero that replaces the static
 * mid-feed Hollywood beat. It cycles through DASH districts every 5s with a
 * one-shot crossfade, and tapping the WHOLE card taps THROUGH to that
 * district (the Movies page, an experience page, or VOYO).
 *
 * Visual language is lifted from CategoryHero (radial accent wash, slow
 * light-sweep, LIVE pill, marquee channel icon + name). Battery-light: a
 * single rotation interval that PAUSES off-screen (IntersectionObserver) and
 * when the tab is hidden (document.hidden) — same recipe CategoryHero uses.
 */

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

// Parse "#RRGGBB" → "r,g,b" so we can mix arbitrary alpha into the accent.
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

// A darker companion for the gradient pip (shade ~ 0.62 of accent).
function shade(hex: string, factor = 0.62): string {
  const [r, g, b] = rgb(hex).split(',').map(Number);
  const f = (v: number) => Math.round(v * factor).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

// ── Destination spec — declarative, resolved against the catalog below ──
interface DestSpec {
  /** District display name. */
  name: string;
  /** One-word tagline. */
  tagline: string;
  /** Single signature color. */
  accent: string;
  /** Experiences to pull a representative channel from (first non-empty wins). */
  experiences?: string[];
  /** Preferred channel to surface (matched by name), else the first. */
  lead?: RegExp;
  /** VOYO destinations carry no channel — render the music-styled visual. */
  voyo?: boolean;
  /** Tap-through. */
  action: () => void;
}

interface ResolvedDest extends DestSpec {
  channel: CatalogChannel | null;
}

export function FeaturedDestination({
  catalog,
  lang,
  navigate,
  openVoyo,
  featured,
  rotateMs = 5000,
}: {
  catalog: Catalog;
  lang: Lang;
  /** react-router navigate — wired by HomePage. */
  navigate: (to: string) => void;
  /** Open VOYO (e.g. useOpenVoyo('stations')). */
  openVoyo?: () => void;
  /** Curated single-feature: show ONLY this destination (by name), no rotation. */
  featured?: string;
  /** Rotation cadence (default 5s) — only used when not curating a single feature. */
  rotateMs?: number;
}) {
  // The district roster. Channels resolve from catalog.byExperience; a
  // destination is dropped if it has no channel AND no special action.
  const destinations = useMemo<ResolvedDest[]>(() => {
    const specs: DestSpec[] = [
      {
        name: 'Hollywood',
        tagline: lang === 'fr' ? 'Cinéma' : 'Movies',
        accent: '#E8B53A',
        experiences: ['Movies'],
        lead: /hollywood/i,
        action: () => navigate('/movies'),
      },
      {
        name: 'France 24',
        tagline: lang === 'fr' ? 'Infos' : 'News',
        accent: '#EF4444',
        experiences: ['News'],
        lead: /france ?24/i,
        action: () => navigate('/live/news'),
      },
      {
        name: 'Disney',
        tagline: lang === 'fr' ? 'Enfants' : 'Kids',
        accent: '#EC4899',
        experiences: ['Kids'],
        lead: /disney/i,
        action: () => navigate('/live/kids'),
      },
      {
        name: 'World Cup',
        tagline: 'Sports',
        accent: '#22C55E',
        experiences: ['World Cup', 'Sports'],
        lead: /bein|world ?cup/i,
        action: () => navigate('/live/sports'),
      },
      {
        name: 'VOYO',
        tagline: lang === 'fr' ? 'Musique' : 'Music',
        accent: '#9D4EDD',
        voyo: true,
        action: () => openVoyo?.(),
      },
    ];

    const resolve = (spec: DestSpec): ResolvedDest => {
      if (spec.voyo) return { ...spec, channel: null };
      let channel: CatalogChannel | null = null;
      for (const exp of spec.experiences || []) {
        const chans = catalog.byExperience[exp] || [];
        if (chans.length === 0) continue;
        const lead = spec.lead;
        channel = (lead && chans.find((c) => lead.test(c.name))) || chans[0];
        break;
      }
      return { ...spec, channel };
    };

    // Keep VOYO (special action) always; drop channel-backed districts with
    // no resolvable channel.
    const resolved = specs.map(resolve).filter((d) => d.voyo || d.channel != null);
    // Curated single-feature: when a `featured` name is set, show ONLY that one
    // (length 1 → rotation auto-disables). We curate this daily — part of the role.
    if (featured) {
      const one = resolved.find((d) => d.name === featured);
      if (one) return [one];
    }
    return resolved;
  }, [catalog, lang, navigate, openVoyo, featured]);

  const [idx, setIdx] = useState(0);
  const rootRef = useRef<HTMLButtonElement>(null);

  // Auto-rotation — one interval, paused when the tab is hidden OR the card is
  // scrolled off-screen (IntersectionObserver). No work when < 2 destinations.
  useEffect(() => {
    if (destinations.length < 2) return;
    const el = rootRef.current;
    let timer: ReturnType<typeof setInterval> | null = null;
    let visible = true;

    const tick = () => {
      if (!document.hidden && visible) setIdx((i) => (i + 1) % destinations.length);
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
  }, [destinations.length, rotateMs]);

  const dest = destinations[idx % destinations.length] || destinations[0];
  if (!dest) return null;

  const a = rgb(dest.accent);
  const dark = shade(dest.accent);
  // Stable per-accent keyframe names so multiple instances don't collide.
  const uid = dest.accent.replace('#', '');
  // Crossfade key — re-mounts the inner marquee on each destination change.
  const fadeKey = dest.name;

  return (
    <button
      ref={rootRef}
      onPointerDown={() => tap()}
      onClick={() => dest.action()}
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
        transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
      }}
    >
      <style>{`
        @keyframes feat-sweep-${uid} { 0%{transform:translateX(-40%)} 100%{transform:translateX(140%)} }
        @keyframes feat-pip-breathe-${uid} {
          0%,100% { box-shadow: 0 0 22px rgba(${a},0.45); transform: scale(1); }
          50%     { box-shadow: 0 0 34px rgba(${a},0.70); transform: scale(1.06); }
        }
        @keyframes feat-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* SIGNATURE — slow accent light-sweep, continuous */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-y-0 -left-1/3 w-2/3 opacity-70"
          style={{
            background: `linear-gradient(115deg, transparent 20%, rgba(${a},0.07) 46%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
            animation: `feat-sweep-${uid} 7s ease-in-out infinite`,
          }}
        />
      </div>

      {/* Cinema vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* ✦ FEATURED eyebrow — accent-tinted glass chip + quiet pulsing dot */}
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: dest.accent }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: dest.accent }} />
        </span>
        <span className="text-[10.5px] font-bold tracking-[1.5px] uppercase" style={{ color: dest.accent }}>
          ✦ {lang === 'fr' ? 'À découvrir' : 'Featured'}
        </span>
      </div>

      {/* Tap-through affordance — top right */}
      <span
        className="absolute top-4 right-4 flex items-center gap-0.5 text-[11px] font-semibold tracking-wide px-2.5 py-1.5 rounded-full"
        style={{ background: `rgba(${a},0.16)`, border: `1px solid rgba(${a},0.4)`, color: dest.accent }}
      >
        {lang === 'fr' ? 'Ouvrir' : 'Open'}
        <ChevronRight className="w-3 h-3" />
      </span>

      {/* Marquee — district name + tagline + representative channel icon. The
          whole block crossfades (one-shot fade-in) on each destination change. */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
        <div
          key={fadeKey}
          className="flex items-end gap-4 flex-1 min-w-0"
          style={{ animation: 'feat-fade-in 0.6s ease-out' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${a},0.25)` }}
          >
            {dest.channel ? (
              <ChannelIcon src={dest.channel.icon} name={dest.channel.name} size="md" eager className="!w-14 !h-14" />
            ) : (
              // VOYO-styled visual — a music-accent disc, no channel.
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 35% 30%, rgba(${a},0.55), rgba(${a},0.12) 70%)`,
                  boxShadow: `inset 0 0 18px rgba(${a},0.35)`,
                }}
              >
                <span className="text-[26px] leading-none" style={{ filter: `drop-shadow(0 0 8px rgba(${a},0.7))` }}>♫</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[23px] leading-tight font-black text-white tracking-tight line-clamp-2">
              {cleanName(dest.name)}
            </h1>
            <p className="text-[12px] mt-0.5 font-semibold tracking-wide uppercase" style={{ color: dest.accent }}>
              {dest.tagline}
            </p>
          </div>
        </div>
        {/* Gateway pip — breathing arrow, signals "tap to enter". */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${dest.accent}, ${dark})`,
            animation: `feat-pip-breathe-${uid} 2.8s ease-in-out infinite`,
          }}
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </div>
      </div>
    </button>
  );
}
