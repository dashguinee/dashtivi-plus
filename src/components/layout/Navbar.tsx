import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Users, Library, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { tap } from '@/lib/haptics';
import { TiviModeToggle, useVeeCycle } from './TiviModeToggle';

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  isVee?: boolean;
}

// FINAL nav (Aziz, 2026-06-27): Home · Biblio · Vee · Dahub. Exactly 4.
// Live TV is NOT a direct tab — it's reached through Vee's cycle.
// Slot 3 (Vee) is a CYCLING navigator + the visual hero of the bar:
// each tap advances Movies → Series → Live → Home (TiviModeToggle).
const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'navHome', icon: Home },
  { path: '/library', labelKey: 'navBiblio', icon: Library },
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

  // ── Nav visibility: 3-tier fade ──
  // Scrolling → 30%  |  Idle 2s → 100%  |  Idle 5s more → 15% ghost
  const fadeRef = useRef<'full' | 'dim' | 'ghost'>('full');
  const [navOpacity, setNavOpacity] = React.useState<'full' | 'dim' | 'ghost'>('full');
  const dimTimer = useRef<ReturnType<typeof setTimeout>>();
  const ghostTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onScroll = () => {
      clearTimeout(dimTimer.current);
      clearTimeout(ghostTimer.current);
      if (window.scrollY < 80) {
        if (fadeRef.current !== 'full') { fadeRef.current = 'full'; setNavOpacity('full'); }
        return;
      }
      // Scrolling → dim
      if (fadeRef.current !== 'dim') { fadeRef.current = 'dim'; setNavOpacity('dim'); }
      // Idle 2s → full
      dimTimer.current = setTimeout(() => {
        fadeRef.current = 'full'; setNavOpacity('full');
        // Idle 5s more → ghost
        ghostTimer.current = setTimeout(() => {
          if (window.scrollY > 80) { fadeRef.current = 'ghost'; setNavOpacity('ghost'); }
        }, 5000);
      }, 2000);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(dimTimer.current); clearTimeout(ghostTimer.current); };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navRef = useRef<HTMLDivElement>(null);
  const [navGlow, setNavGlow] = React.useState<false | 'full' | 'soft'>(false);
  const glowTimer = useRef<ReturnType<typeof setTimeout>>();
  const FULL_GLOW_TABS = new Set(['/', '/hub']);

  const handleTap = useCallback((path: string) => {
    // Wake from ghost
    clearTimeout(ghostTimer.current);
    if (fadeRef.current !== 'full') { fadeRef.current = 'full'; setNavOpacity('full'); }

    // Home & Hub = full glow, Live/Movies/Series = soft glow
    clearTimeout(glowTimer.current);
    setNavGlow(FULL_GLOW_TABS.has(path) ? 'full' : 'soft');
    glowTimer.current = setTimeout(() => setNavGlow(false), 2000);

    // Re-arm ghost timer
    ghostTimer.current = setTimeout(() => {
      if (window.scrollY > 80) { fadeRef.current = 'ghost'; setNavOpacity('ghost'); }
    }, 7000);
    navigate(path);
  }, [navigate]);

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
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 px-3 pb-4 pt-2 pointer-events-none safe-bottom"
        style={{
          transform: 'translateZ(0)',
          opacity: navOpacity === 'dim' ? 0.3 : navOpacity === 'ghost' ? 0.12 : 1,
          transition: navOpacity === 'dim'
            ? 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            : navOpacity === 'ghost'
              ? 'opacity 2s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 0.4s ease-out',
        }}
      >
        <div
          ref={navRef}
          className="backdrop-blur-lg max-w-md mx-auto h-[62px] rounded-2xl flex items-center justify-around px-1 pointer-events-auto"
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
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            // Slot 3 is the cycling Vee hero pebble.
            if (item.isVee) return <TiviModeToggle key={item.path} />;

            return (
              <button
                key={item.path}
                onPointerDown={() => tap()}
                onClick={() => handleTap(item.path)}
                className="relative flex flex-col items-center justify-center flex-1 h-full"
              >
                {/* Icon — lifts up when active */}
                <div
                  className="relative"
                  style={{
                    transform: active ? 'translateY(-2px) scale(1.12)' : 'scale(1)',
                    color: active ? '#C77DFF' : 'rgba(255,255,255,0.35)',
                    filter: active ? 'drop-shadow(0 0 8px rgba(157, 78, 221, 0.5))' : 'none',
                    transition: 'transform 0.15s ease-out, color 0.1s, filter 0.15s',
                  }}
                >
                  <Icon
                    style={{ width: 22, height: 22 }}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </div>

                {/* Label — fades in when active */}
                <span
                  className="text-[10px] font-medium tracking-wide"
                  style={{
                    color: active ? '#C77DFF' : 'rgba(255,255,255,0.35)',
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
          })}
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
