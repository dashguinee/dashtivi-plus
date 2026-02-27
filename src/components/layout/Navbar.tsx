import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tv, Library, Search, Settings, Sparkles } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/live', label: 'Live', icon: Tv },
  { path: '/services', label: 'Tivi+', icon: Sparkles },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/collections', label: 'Library', icon: Library },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {/* Mobile Bottom Nav — Glassmorphic */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const isTiviPlus = item.path === '/services';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? isTiviPlus
                      ? 'text-accent'
                      : 'text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] font-medium ${isTiviPlus && !isActive ? 'text-accent/60' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div
                    className={`absolute -bottom-0.5 w-8 h-0.5 rounded-full ${
                      isTiviPlus ? 'bg-accent' : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar — Glass Panel */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 xl:w-52 z-30 flex-col glass-strong pt-16">
        <div className="flex-1 flex flex-col gap-1 p-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const isTiviPlus = item.path === '/services';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? isTiviPlus
                      ? 'bg-accent/10 text-accent-light'
                      : 'bg-primary/10 text-primary-light'
                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-sm font-medium hidden xl:block">{item.label}</span>
                {isActive && (
                  <div
                    className={`absolute left-0 w-0.5 h-8 rounded-r-full ${
                      isTiviPlus ? 'bg-accent' : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 hidden xl:block">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-white/5">
            <p className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">Powered by</p>
            <p className="text-sm font-bold">
              <span className="text-gradient">TIVI</span>
              <span className="text-accent text-xs font-black ml-0.5">+</span>
            </p>
            <p className="text-[10px] text-text-muted mt-1">DASH Lifestyle</p>
          </div>
        </div>
      </aside>
    </>
  );
};
