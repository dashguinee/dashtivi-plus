import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Sparkles, Search, Library, Settings, Gamepad2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   TIVI+ Bottom Nav — OG DashWebTV DNA
   Full-width dock, edge-to-edge glass, purple glow border
   Mobile: bottom bar | Desktop: left sidebar hover-expand
   ═══════════════════════════════════════════════════════════ */

interface NavItem {
  path: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  isLive?: boolean;
  isSpecial?: boolean;
  desktopOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/live', label: 'Live TV', icon: Tv, isLive: true },
  { path: '/services', label: 'DASH+', icon: Sparkles, isSpecial: true },
  { path: '/games', label: 'Games', icon: Gamepad2 },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/collections', label: 'Library', icon: Library, desktopOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, desktopOnly: true },
];

const mobileItems = navItems.filter((item) => !item.desktopOnly);

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHover, setSidebarHover] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const desktopMain = navItems.filter((item) => item.path !== '/settings');
  const settingsItem = navItems.find((item) => item.path === '/settings')!;

  return (
    <>
      {/* ═══ MOBILE BOTTOM NAV — OG Dock Style ═══ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(157, 78, 221, 0.15)',
        }}
      >
        <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto safe-bottom">
          {mobileItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-300"
                aria-label={item.label}
              >
                {/* Active indicator bar — OG style bottom accent */}
                {active && (
                  <div
                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-500"
                    style={{
                      width: '30px',
                      background: item.isSpecial
                        ? 'linear-gradient(90deg, #FFD700, #FF6B35)'
                        : 'var(--primary-purple-light, #C77DFF)',
                      boxShadow: item.isSpecial
                        ? '0 0 10px rgba(255, 215, 0, 0.6)'
                        : '0 0 10px rgba(157, 78, 221, 0.6)',
                    }}
                  />
                )}

                {/* Icon */}
                <div className="relative">
                  <Icon
                    className="transition-all duration-300"
                    style={{
                      width: 24,
                      height: 24,
                      color: active
                        ? item.isSpecial
                          ? '#FFD700'
                          : '#C77DFF'
                        : '#6B6B6B',
                      filter: active
                        ? item.isSpecial
                          ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))'
                          : 'drop-shadow(0 0 8px rgba(157, 78, 221, 0.5))'
                        : 'none',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />

                  {/* Live pulse dot */}
                  {item.isLive && (
                    <span
                      className="absolute -top-0.5 -right-1.5 w-[6px] h-[6px] rounded-full bg-success"
                      style={{
                        boxShadow: active ? '0 0 6px rgba(0, 200, 83, 0.8)' : 'none',
                        animation: 'live-ring 2s infinite',
                      }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className="text-[11px] font-semibold tracking-wide transition-colors duration-300"
                  style={{
                    color: active
                      ? item.isSpecial
                        ? '#FFD700'
                        : '#C77DFF'
                      : '#6B6B6B',
                    letterSpacing: '0.5px',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ DESKTOP SIDEBAR — Slim expand-on-hover ═══ */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300 ease-out"
        style={{
          width: sidebarHover ? 220 : 72,
          background: 'rgba(10, 10, 15, 0.90)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
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
            className="overflow-hidden transition-all duration-300"
            style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
          >
            <span className="text-lg font-bold whitespace-nowrap tracking-tight">
              <span className="text-gradient">TIVI</span>
              <span className="text-accent-gold text-sm font-black ml-0.5">+</span>
            </span>
          </div>
        </div>

        {/* Main items */}
        <div className="flex-1 flex flex-col gap-1 px-3 pt-6 overflow-hidden">
          {desktopMain.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex items-center gap-3 h-11 rounded-xl transition-all duration-200 group"
                style={{
                  paddingLeft: sidebarHover ? 12 : 0,
                  justifyContent: sidebarHover ? 'flex-start' : 'center',
                  background: active
                    ? item.isSpecial
                      ? 'rgba(255, 215, 0, 0.08)'
                      : 'rgba(157, 78, 221, 0.08)'
                    : 'transparent',
                  color: active
                    ? item.isSpecial
                      ? '#FFD700'
                      : '#C77DFF'
                    : '#B8B8B8',
                }}
              >
                {/* Left accent bar */}
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{
                      background: item.isSpecial
                        ? 'linear-gradient(180deg, #FFD700, #FF6B35)'
                        : 'linear-gradient(180deg, #C77DFF, #9D4EDD)',
                      boxShadow: item.isSpecial
                        ? '0 0 8px rgba(255, 215, 0, 0.5)'
                        : '0 0 8px rgba(157, 78, 221, 0.5)',
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
                      className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-success"
                      style={{
                        boxShadow: active ? '0 0 6px rgba(0, 200, 83, 0.8)' : 'none',
                        animation: 'live-ring 2s infinite',
                      }}
                    />
                  )}
                </div>

                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                  style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={() => navigate(settingsItem.path)}
            className="relative flex items-center gap-3 h-11 w-full rounded-xl transition-all duration-200"
            style={{
              paddingLeft: sidebarHover ? 12 : 0,
              justifyContent: sidebarHover ? 'flex-start' : 'center',
              background: isActive('/settings') ? 'rgba(157, 78, 221, 0.08)' : 'transparent',
              color: isActive('/settings') ? '#C77DFF' : '#6B6B6B',
            }}
          >
            {isActive('/settings') && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                style={{
                  background: 'linear-gradient(180deg, #C77DFF, #9D4EDD)',
                  boxShadow: '0 0 8px rgba(157, 78, 221, 0.5)',
                }}
              />
            )}
            <Settings className="w-5 h-5 flex-shrink-0" strokeWidth={isActive('/settings') ? 2.5 : 1.8} />
            <span
              className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
              style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
            >
              Settings
            </span>
          </button>
        </div>

        {/* DASH branding on expand */}
        <div
          className="px-3 pb-4 flex-shrink-0 overflow-hidden transition-all duration-300"
          style={{ maxHeight: sidebarHover ? 96 : 0, opacity: sidebarHover ? 1 : 0 }}
        >
          <div
            className="p-3 rounded-xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.06) 0%, rgba(0, 245, 255, 0.04) 100%)',
              border: '1px solid rgba(157, 78, 221, 0.12)',
            }}
          >
            <p className="text-[10px] text-text-muted uppercase tracking-widest">Powered by</p>
            <p className="text-sm font-bold mt-0.5">
              <span className="text-gradient">DASH</span>
              <span className="text-text-secondary text-xs font-medium ml-1">Lifestyle</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
