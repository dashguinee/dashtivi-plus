import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Clapperboard, PlayCircle, Users } from 'lucide-react';
import { useLanguage } from '@/i18n';
import type { TranslationKey } from '@/i18n';

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  isLive?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'navHome', icon: Home },
  { path: '/live', labelKey: 'navLiveTV', icon: Tv, isLive: true },
  { path: '/movies', labelKey: 'navMovies', icon: Clapperboard },
  { path: '/series', labelKey: 'navSeries', icon: PlayCircle },
  { path: '/hub', labelKey: 'navHub', icon: Users },
];

export const Navbar: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHover, setSidebarHover] = useState(false);
  const [navGlow, setNavGlow] = useState(false);

  // Navbar: visible by default. Hides on scroll/touch. Returns after 2s idle.
  // Touch again → hides. Simple two-state: show or hide.
  const [navShow, setNavShow] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  // Route change → visible
  useEffect(() => { setNavShow(true); }, [location.pathname]);

  useEffect(() => {
    const startIdle = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setNavShow(true), 2000);
    };

    const onTouch = () => {
      if (window.scrollY > 100) setNavShow(false);
      startIdle();
    };

    // At top → always show, no timer needed
    const onScroll = () => {
      if (window.scrollY < 100) { setNavShow(true); return; }
      setNavShow(false);
      startIdle();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    startIdle();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouch);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(3);
  };

  const handleTap = useCallback((path: string) => {
    haptic();
    navigate(path);
    setNavGlow(true);
    setTimeout(() => setNavGlow(false), 2000);
  }, [navigate]);

  return (
    <>
      {/* MOBILE BOTTOM NAV — OG dasuperhub style */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 px-3 pb-4 pt-2 pointer-events-none safe-bottom"
        style={{
          opacity: navShow ? 1 : 0,
          transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="backdrop-blur-lg max-w-md mx-auto h-[62px] rounded-2xl flex items-center justify-around px-1 pointer-events-auto transition-[background-color,border-color,box-shadow] duration-500"
          style={{
            background: navGlow
              ? 'linear-gradient(135deg, rgba(157,78,221,0.12) 0%, rgba(10,10,15,0.65) 50%, rgba(157,78,221,0.08) 100%)'
              : 'rgba(10, 10, 15, 0.55)',
            border: navGlow
              ? '1px solid rgba(157, 78, 221, 0.5)'
              : '1px solid rgba(157, 78, 221, 0.12)',
            boxShadow: navGlow
              ? '0 0 30px rgba(157, 78, 221, 0.4), 0 0 60px rgba(157, 78, 221, 0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(157,78,221,0.05)',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleTap(item.path)}
                className="relative flex flex-col items-center justify-center flex-1 h-full transition-colors"
              >
                {/* Icon — lifts up when active */}
                <div
                  className="relative transition-[transform,color,filter] duration-300"
                  style={{
                    transform: active ? 'translateY(-2px) scale(1.12)' : 'scale(1)',
                    color: active ? '#C77DFF' : 'rgba(255,255,255,0.35)',
                    filter: active ? 'drop-shadow(0 0 8px rgba(157, 78, 221, 0.5))' : 'none',
                  }}
                >
                  <Icon
                    style={{ width: 22, height: 22 }}
                    strokeWidth={active ? 2.4 : 1.8}
                  />

                  {/* Live TV pulse dot */}
                  {item.isLive && (
                    <span
                      className="absolute -top-0.5 -right-1.5 w-[6px] h-[6px] rounded-full"
                      style={{
                        background: '#C77DFF',
                        boxShadow: '0 0 6px rgba(157, 78, 221, 0.8)',
                        animation: 'live-ring 2s infinite',
                      }}
                    />
                  )}
                </div>

                {/* Label — fades in when active */}
                <span
                  className="text-[10px] font-medium tracking-wide transition-[color,opacity,margin] duration-300"
                  style={{
                    color: active ? '#C77DFF' : 'rgba(255,255,255,0.35)',
                    opacity: active ? 1 : 0,
                    marginTop: active ? 3 : 0,
                    height: active ? 'auto' : 0,
                    overflow: 'hidden',
                  }}
                >
                  {t(item.labelKey)}
                </span>

                {/* Bottom dot indicator */}
                {active && (
                  <div
                    className="absolute bottom-1.5 w-5 h-[2px] rounded-full transition-[background-color,box-shadow] duration-300"
                    style={{
                      background: navGlow ? '#a855f7' : '#9D4EDD',
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
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
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
              <span className="text-gradient">DashTivi</span>
              <span className="text-primary-light text-sm font-black ml-0.5">+</span>
            </span>
          </div>
        </div>

        {/* Main items */}
        <div className="flex-1 flex flex-col gap-1 px-3 pt-6 overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex items-center gap-3 h-11 rounded-xl transition-[background-color,color,padding] duration-300 group"
                style={{
                  paddingLeft: sidebarHover ? 12 : 0,
                  justifyContent: sidebarHover ? 'flex-start' : 'center',
                  background: active ? 'rgba(157, 78, 221, 0.08)' : 'transparent',
                  color: active ? '#C77DFF' : '#B8B8B8',
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
                    style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {item.isLive && (
                    <span
                      className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-primary"
                      style={{
                        boxShadow: active ? '0 0 6px rgba(157,78,221,0.6)' : 'none',
                        animation: 'live-ring 2s infinite',
                      }}
                    />
                  )}
                </div>

                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300"
                  style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
                >
                  {t(item.labelKey)}
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
