import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Film, PlayCircle, Globe } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: string | number }>;
  isLive?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/live', label: 'Live TV', icon: Tv, isLive: true },
  { path: '/movies', label: 'Movies', icon: Film },
  { path: '/series', label: 'Series', icon: PlayCircle },
  { path: '/french', label: 'WorldEX', icon: Globe },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHover, setSidebarHover] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* MOBILE BOTTOM NAV — floating island */}
      <div className="lg:hidden fixed bottom-3 inset-x-3 z-50 safe-bottom">
        <nav
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(12, 12, 18, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(157, 78, 221, 0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(157,78,221,0.04)',
          }}
        >
          <div className="flex items-center justify-around px-1 h-14">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              const isPrimary = item.path === '/' || item.path === '/live';
              const inactiveColor = isPrimary ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.28)';

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center gap-[3px] py-1 px-3 transition-all duration-300"
                  aria-label={item.label}
                >
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl transition-all duration-500"
                      style={{
                        background: 'rgba(157, 78, 221, 0.08)',
                      }}
                    />
                  )}

                  <div className="relative z-10">
                    <Icon
                      className="transition-all duration-300"
                      style={{
                        width: 20,
                        height: 20,
                        color: active ? '#C77DFF' : inactiveColor,
                        filter: active ? 'drop-shadow(0 0 6px rgba(157, 78, 221, 0.4))' : 'none',
                      }}
                      strokeWidth={active ? 2.5 : 1.8}
                    />

                    {item.isLive && (
                      <span
                        className="absolute -top-0.5 -right-1 w-[5px] h-[5px] rounded-full bg-primary"
                        style={{
                          boxShadow: '0 0 4px rgba(157,78,221,0.6)',
                          animation: 'live-ring 2s infinite',
                        }}
                      />
                    )}
                  </div>

                  <span
                    className="relative z-10 text-[9px] font-medium transition-colors duration-300"
                    style={{ color: active ? '#C77DFF' : inactiveColor }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* DESKTOP SIDEBAR */}
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
              <span className="text-gradient">DashTivi</span>
              <span className="text-primary-light text-sm font-black ml-0.5">+</span>
            </span>
          </div>
        </div>

        {/* Main items */}
        <div className="flex-1 flex flex-col gap-1 px-3 pt-6 overflow-hidden">
          {navItems.map((item) => {
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
                  className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                  style={{ width: sidebarHover ? 'auto' : 0, opacity: sidebarHover ? 1 : 0 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* DASH branding on expand */}
        <div
          className="px-3 pb-4 flex-shrink-0 overflow-hidden transition-all duration-300"
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
