import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 safe-top">
      <div
        className={`flex items-center justify-between px-4 py-3 transition-all duration-500 ${
          isHome
            ? 'bg-gradient-to-b from-black/60 via-black/30 to-transparent'
            : 'glass-strong'
        }`}
      >
        {/* Logo — TIVI+ brand */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center group-hover:animate-glow-pulse transition-all shadow-lg shadow-primary/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <polygon points="8,5 8,19 19,12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wide hidden sm:flex items-baseline gap-0.5">
            <span className="text-gradient">TIVI</span>
            <span className="text-accent text-sm font-black">+</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { path: '/', label: 'Home' },
            { path: '/live', label: 'Live TV' },
            { path: '/services', label: 'Tivi+' },
            { path: '/collections', label: 'Collections' },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            const isTiviPlus = item.path === '/services';
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isTiviPlus
                      ? 'text-accent bg-accent/10'
                      : 'text-white bg-white/5'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/search')}
            className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-all"
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5 text-text-secondary" />
          </button>
          <button
            className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5 text-text-secondary" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center hover:from-primary/30 hover:to-primary/20 transition-all border border-primary/10"
            aria-label="Profile"
          >
            <User className="w-4 h-4 text-primary-light" />
          </button>
        </div>
      </div>
    </header>
  );
};
