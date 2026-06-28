import React, { useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tv, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { tap } from '@/lib/haptics';
import { TiviModeToggle, useVeeCycle } from './TiviModeToggle';

type GlyphProps = React.SVGProps<SVGSVGElement> & { size?: string | number };

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: React.FC<GlyphProps>;
  isVee?: boolean;
}

// ── BESPOKE DASH NAV GLYPHS ───────────────────────────────────────────────
// Hand-drawn, not stock lucide. Monochrome `currentColor` stroke so they sit
// with the silver Dahub + the V pebble. Rounded joins, a peaked/geometric
// silhouette and one subtle low-opacity "structure" line each — clean, premium,
// a touch intergalactic (DBS visual language).

// HOME — the refined house, now with OyeAfrica CHARACTER: a warm gold→bronze
// metallic bed (the same DASH golden-bronze family as OyeAfricaCard, dark-middle
// 135° gradient for depth), a subtle warm-sparkle GRAIN clipped to the house so
// it reads as a textured surface (not flat), a soft AMBIENT halo spilling behind
// it (the doorway light on the bar), the lit-from-within neon doorway, and a tiny
// spark at the peak. Unique ids per instance (useId) so mobile + desktop copies
// never collide as paint servers.
const HomeGlyph: React.FC<GlyphProps> = ({ strokeWidth = 1.8, size: _s, style, ...props }) => {
  const uid = React.useId();
  const gBed = `hgBed-${uid}`;     // OyeAfrica metallic bed (gold→dark→bronze, 135°)
  const gGold = `hgGold-${uid}`;   // lit gold → bronze, for the outline shades
  const gDoor = `hgDoor-${uid}`;   // warm neon inside the doorway
  const gHalo = `hgHalo-${uid}`;   // ambient warm spill
  const fBlur = `hgBlur-${uid}`;
  const fGrain = `hgGrain-${uid}`;
  const cHouse = `hgClip-${uid}`;
  const house = 'M3.5 11 L12 3.7 L20.5 11 V18.7 Q20.5 21 18.3 21 H5.7 Q3.5 21 3.5 18.7 Z';
  const doorOutline = 'M9.7 21 V15.8 Q9.7 13.2 12 13.2 Q14.3 13.2 14.3 15.8 V21';
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible', ...style }} {...props}>
      <defs>
        {/* OyeAfrica bed — gold corner → warm dark middle → bronze (135°, depth) */}
        <linearGradient id={gBed} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0A93E" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#1C1208" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8A5A1E" stopOpacity="0.22" />
        </linearGradient>
        {/* lit gold at the peak → bronze at the base (outline shades) */}
        <linearGradient id={gGold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="34%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#E0A93E" />
          <stop offset="100%" stopColor="#8A5A1E" />
        </linearGradient>
        {/* warm neon — lit from within the doorway */}
        <radialGradient id={gDoor} cx="50%" cy="74%" r="72%">
          <stop offset="0%" stopColor="#FFF6CC" stopOpacity="1" />
          <stop offset="50%" stopColor="#FFD24A" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E0A93E" stopOpacity="0.1" />
        </radialGradient>
        {/* ambient warm halo — soft, fades to nothing */}
        <radialGradient id={gHalo} cx="50%" cy="58%" r="62%">
          <stop offset="0%" stopColor="#E0A93E" stopOpacity="0.42" />
          <stop offset="48%" stopColor="#8A5A1E" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8A5A1E" stopOpacity="0" />
        </radialGradient>
        <filter id={fBlur} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
        {/* fine warm sparkle grain → textured metallic surface */}
        <filter id={fGrain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 1  0 0 0 0 0.86  0 0 0 0 0.55  0.7 0.7 0.7 0 0" />
        </filter>
        <clipPath id={cHouse}><path d={house} /></clipPath>
      </defs>
      {/* ambient warm halo — doorway light spilling onto the bar (overflow visible) */}
      <ellipse cx="12" cy="14.5" rx="15" ry="13" fill={`url(#${gHalo})`} opacity="0.7" />
      {/* OyeAfrica metallic bed inside the house */}
      <path d={house} fill={`url(#${gBed})`} />
      {/* warm sparkle grain, clipped to the house — texture, not flat */}
      <g clipPath={`url(#${cHouse})`}>
        <rect x="0" y="0" width="24" height="24" filter={`url(#${fGrain})`} opacity="0.13" />
      </g>
      {/* neon-lit doorway — soft glowing fill */}
      <path d={`${doorOutline} Z`} fill={`url(#${gDoor})`} filter={`url(#${fBlur})`} />
      {/* tiny warm spark near the roof peak (the OyeAfrica spark nod) */}
      <circle cx="12" cy="6.6" r="0.65" fill="#FFF6CC" opacity="0.85" />
      {/* house outline — golden → bronze shades */}
      <path d={house} fill="none" stroke={`url(#${gGold})`} strokeWidth={strokeWidth as number}
        strokeLinecap="round" strokeLinejoin="round" />
      {/* arched door outline — golden */}
      <path d={doorOutline} fill="none" stroke={`url(#${gGold})`} strokeWidth={strokeWidth as number}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// BIBLIO — a small library: three upright spines of varied height with rounded
// tops + one book leaning into the stack, all resting on a faint shelf line.
const BiblioGlyph: React.FC<GlyphProps> = ({ strokeWidth = 1.8, size: _s, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth as number}
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.6 9.7 Q4.6 8.6 5.7 8.6 H6.8 Q7.9 8.6 7.9 9.7 V19.3 H4.6 Z" />
    <path d="M8.7 7.7 Q8.7 6.6 9.8 6.6 H10.9 Q12 6.6 12 7.7 V19.3 H8.7 Z" />
    <path d="M12.8 9.1 Q12.8 8 13.9 8 H15 Q16.1 8 16.1 9.1 V19.3 H12.8 Z" />
    <path d="M16.9 19.3 L18.6 10.3 L20.3 10.7 L18.6 19.3 Z" />
    <path d="M3.7 19.3 H20.3" opacity="0.5" />
  </svg>
);

// FINAL nav (Aziz, 2026-06-27): Home · Biblio · Vee · Dahub. Exactly 4.
// Live TV is NOT a direct tab — it's reached through Vee's cycle.
// Slot 3 (Vee) is a CYCLING navigator + the visual hero of the bar:
// each tap advances Movies → Series → Live → Home (TiviModeToggle).
const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'navHome', icon: HomeGlyph },
  { path: '/library', labelKey: 'navBiblio', icon: BiblioGlyph },
  { path: '/__vee__', labelKey: 'navVee', icon: Sparkles, isVee: true },
  { path: '/hub', labelKey: 'navDahub', icon: Users },
];

export const Navbar: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const vee = useVeeCycle();
  const sidebarHoverRef = useRef(false);
  const [sidebarHover, setSidebarHoverState] = React.useState(false);

  // Bottom nav is FIXED + STEADY — it must not move, hide, dim, or transform on
  // scroll. (The old 3-tier scroll-fade — dim on scroll, ghost when idle — was
  // removed: Aziz wants the bar scroll-immune.)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navRef = useRef<HTMLDivElement>(null);
  const [navGlow, setNavGlow] = React.useState<false | 'full' | 'soft'>(false);
  const glowTimer = useRef<ReturnType<typeof setTimeout>>();
  const FULL_GLOW_TABS = new Set(['/', '/hub']);

  const handleTap = useCallback((path: string) => {
    // Home & Hub = full glow, Live/Movies/Series = soft glow (tap feedback only).
    clearTimeout(glowTimer.current);
    setNavGlow(FULL_GLOW_TABS.has(path) ? 'full' : 'soft');
    glowTimer.current = setTimeout(() => setNavGlow(false), 2000);
    navigate(path);
  }, [navigate]);

  // One mobile tab button (fixed width so the bar can be composed by groups
  // instead of evenly-spaced flex-1 slots). Same tap/haptic/active grammar.
  const renderMobileItem = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    const isDahub = item.path === '/hub';
    const isBiblio = item.path === '/library';
    // Vertical: the non-V items sit a few px lower than V's baseline so only V pops.
    // Dahub's Users glyph optically reads a touch high relative to that, so it rests
    // ~2px higher than Home/Biblio to keep all three level on ONE baseline.
    const restY = isDahub ? 5 : 7;
    const iconTransform = active
      ? `translateY(${restY - 2}px) scale(1.12)`
      : `translateY(${restY}px)`;
    // Biblio's BookOpen reads a hair smaller than the other glyphs (premium rhythm).
    const iconSize = isBiblio ? 20 : 22;
    // Graft 3: Dahub wears the silver (same metal palette as the channel-count badge).
    const iconColor = isDahub
      ? (active ? '#e6eaf0' : '#aab1bd')
      : (active ? '#C77DFF' : 'rgba(255,255,255,0.35)');
    const iconFilter = isDahub
      ? 'drop-shadow(0 0 5px rgba(216,221,230,0.30))'
      : (active ? 'drop-shadow(0 0 8px rgba(157, 78, 221, 0.5))' : 'none');
    return (
      <button
        key={item.path}
        onPointerDown={() => tap()}
        onClick={() => handleTap(item.path)}
        className="relative flex flex-col items-center justify-center w-12 h-full"
        // Exact 1px left-shift for Biblio (matches the V pebble's 1px); Home and
        // Dahub stay put. translateX is visual only, so it doesn't reflow the others.
        style={isBiblio ? { transform: 'translateX(-1px)' } : undefined}
      >
        {/* Icon — lifts up when active */}
        <div
          className="relative"
          style={{
            transform: iconTransform,
            color: iconColor,
            filter: iconFilter,
            transition: 'transform 0.15s ease-out, color 0.1s, filter 0.15s',
          }}
        >
          {/* Graft 3: frosted silver chip behind Dahub — reuses .tivi-nav-silver
              (the tivi-count-metal palette + shimmer), low opacity + backdrop-blur. */}
          {isDahub && (
            <div
              className="tivi-nav-silver absolute left-1/2 top-1/2 rounded-[11px] pointer-events-none"
              style={{
                width: 34,
                height: 34,
                transform: 'translate(-50%, -50%)',
                opacity: 0.11,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            />
          )}
          <Icon
            style={{ width: iconSize, height: iconSize, position: 'relative' }}
            strokeWidth={active ? 2.4 : 1.8}
          />
        </div>

        {/* Label — fades in when active */}
        <span
          className="text-[10px] font-medium tracking-wide"
          style={{
            color: active ? (item.path === '/' ? '#D4A053' : '#C77DFF') : 'rgba(255,255,255,0.35)',
            opacity: active ? 1 : 0,
            marginTop: active ? 3 : 0,
            height: active ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity 0.1s, margin 0.15s ease-out, color 0.1s',
          }}
        >
          {t(item.labelKey)}
        </span>

        {/* Bottom dot indicator */}
        {active && (
          <div
            className="absolute bottom-1.5 w-5 h-[2px] rounded-full"
            style={{
              background: '#9D4EDD',
              boxShadow: '0 0 6px rgba(157, 78, 221, 0.5)',
            }}
          />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Subtle pulse for content tabs (Live/Movies/Series) */}
      <style>{`
        @keyframes nav-pulse-subtle {
          0% { border-color: rgba(157,78,221,0.25); box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 16px rgba(157,78,221,0.10); }
          100% { border-color: rgba(157,78,221,0.12); box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(157,78,221,0.05); }
        }
        .nav-pulse { animation: nav-pulse-subtle 1s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 px-5 pb-4 pt-2 pointer-events-none safe-bottom"
        style={{
          transform: 'translateZ(0)',
          opacity: 1,
        }}
      >
        <div
          ref={navRef}
          className="backdrop-blur-lg max-w-[400px] mx-auto h-[62px] rounded-2xl flex items-center justify-between px-4 pointer-events-auto"
          style={{
            background: navGlow === 'full'
              ? 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,15,0.65) 50%, rgba(157,78,221,0.08) 100%)'
              : navGlow === 'soft'
                ? 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(10,10,15,0.58) 50%, rgba(157,78,221,0.04) 100%)'
                : 'rgba(10, 10, 15, 0.55)',
            border: navGlow === 'full'
              ? '1px solid rgba(157, 78, 221, 0.5)'
              : navGlow === 'soft'
                ? '1px solid rgba(157, 78, 221, 0.25)'
                : '1px solid rgba(157, 78, 221, 0.12)',
            boxShadow: navGlow === 'full'
              ? '0 0 30px rgba(157, 78, 221, 0.4), 0 0 60px rgba(157, 78, 221, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
              : navGlow === 'soft'
                ? '0 0 20px rgba(157, 78, 221, 0.18), 0 0 40px rgba(157, 78, 221, 0.06)'
                : '0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(157,78,221,0.05)',
            transition: navGlow
              ? 'background 0.08s ease-out, border-color 0.08s ease-out, box-shadow 0.08s ease-out'
              : 'background 1.2s cubic-bezier(0.16,1,0.3,1), border-color 1.2s cubic-bezier(0.16,1,0.3,1), box-shadow 1.2s cubic-bezier(0.16,1,0.3,1)',
            // Tiny whole-bar rightward bias (~2px) to emulate the V pebble's bias.
            transform: 'translateX(2px)',
          }}
        >
          {/* Even rhythm: 4 items equally spaced via justify-between, breathing
              symmetrically off BOTH edges (Home off the left mirrors Dahub off the
              right). Only V pops above the lowered baseline. */}
          {renderMobileItem(NAV_ITEMS[0]) /* Home */}
          {renderMobileItem(NAV_ITEMS[1]) /* Biblio */}
          <TiviModeToggle /> {/* Vee — the cycling pebble */}
          {renderMobileItem(NAV_ITEMS[3]) /* Dahub */}
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-[width] duration-300 ease-out"
        style={{
          width: sidebarHover ? 220 : 72,
          background: 'rgba(10, 10, 15, 0.60)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
          borderRight: '1px solid rgba(157, 78, 221, 0.1)',
        }}
        onMouseEnter={() => { sidebarHoverRef.current = true; setSidebarHoverState(true); }}
        onMouseLeave={() => { sidebarHoverRef.current = false; setSidebarHoverState(false); }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06] flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
              boxShadow: '0 0 16px rgba(157, 78, 221, 0.3)',
            }}
          >
            <Tv className="w-4 h-4 text-white fill-white" />
          </div>
          <div
            className="overflow-hidden transition-[width,opacity] duration-300"
            style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
          >
            <span className="text-lg font-bold whitespace-nowrap tracking-tight">
              <span className="uppercase text-white" style={{ fontFamily: "'Clash Display','Space Grotesk',sans-serif", letterSpacing: '-0.03em' }}>DASH<span className="font-light text-white/55 normal-case">tivi</span></span>
              <span className="text-sm font-black ml-0.5" style={{ background: 'linear-gradient(135deg,#C77DFF,#22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>+</span>
            </span>
          </div>
        </div>

        {/* Main items */}
        <div className="flex-1 flex flex-col gap-1 px-3 pt-6 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            // Vee = cycling hero (Movies → Series → Live → Home), lilac accent.
            const isVee = item.isVee;
            const active = isVee ? vee.isVeeActive : isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => (isVee ? vee.onTap() : navigate(item.path))}
                className="relative flex items-center gap-3 h-11 rounded-xl transition-[background-color,color,padding] duration-300 group"
                style={{
                  paddingLeft: sidebarHover ? 12 : 0,
                  justifyContent: sidebarHover ? 'flex-start' : 'center',
                  background: isVee
                    ? (active ? 'rgba(157, 78, 221, 0.16)' : 'rgba(157, 78, 221, 0.06)')
                    : (active ? 'rgba(157, 78, 221, 0.08)' : 'transparent'),
                  color: isVee ? '#C77DFF' : (active ? '#C77DFF' : '#B8B8B8'),
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{
                      background: 'linear-gradient(180deg, #C77DFF, #9D4EDD)',
                      boxShadow: '0 0 8px rgba(157, 78, 221, 0.5)',
                    }}
                  />
                )}

                <div className="relative flex-shrink-0">
                  <Icon
                    className="w-5 h-5 transition-transform duration-300"
                    style={{
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                      filter: isVee ? 'drop-shadow(0 0 6px rgba(199,125,255,0.6))' : 'none',
                    }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </div>

                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300"
                  style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
                >
                  {isVee ? `${t(item.labelKey)} · ${vee.nextLabel}` : t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* DASH branding on expand */}
        <div
          className="px-3 pb-4 flex-shrink-0 overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: sidebarHover ? 96 : 0, opacity: sidebarHover ? 1 : 0 }}
        >
          <div
            className="p-3 rounded-xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.06) 0%, rgba(157, 78, 221, 0.02) 100%)',
              border: '1px solid rgba(157, 78, 221, 0.12)',
            }}
          >
            <p className="text-[10px] text-text-muted uppercase tracking-widest">Powered by</p>
            <p className="text-sm font-bold mt-0.5">
              <span className="text-gradient">DASH</span>
              <span className="text-text-secondary text-xs font-medium ml-1">Premium</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
