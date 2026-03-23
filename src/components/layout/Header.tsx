import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tv, LogOut, Volume2, VolumeX } from 'lucide-react';
import { toggleAmbient } from '@/lib/ambient-audio';

interface Props {
  onLogout?: () => void;
}

export const Header: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [ambientOn, setAmbientOn] = useState(true);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 safe-top">
      <div
        className={`flex items-center justify-between px-4 py-3 transition-all duration-500 ${
          isHome
            ? 'bg-gradient-to-b from-black/60 via-black/30 to-transparent'
            : 'glass-strong'
        }`}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center group-hover:animate-glow-pulse transition-all shadow-lg shadow-primary/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide hidden sm:flex items-baseline gap-0.5">
            <span className="text-gradient">DashTivi</span>
            <span className="text-primary-light text-sm font-black">+</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { path: '/', label: 'Home' },
            { path: '/live', label: 'Live TV' },
            { path: '/movies', label: 'Movies' },
            { path: '/series', label: 'Series' },
            { path: '/french', label: 'French' },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white bg-white/5'
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
            onClick={() => {
              const on = toggleAmbient();
              setAmbientOn(on);
            }}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            title={ambientOn ? 'Mute ambient' : 'Play ambient'}
          >
            {ambientOn ? <Volume2 className="w-4 h-4 text-primary-light" /> : <VolumeX className="w-4 h-4 text-white/40" />}
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-all"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-text-secondary" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
