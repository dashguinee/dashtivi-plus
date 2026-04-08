import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tv, LogOut, Volume2, VolumeX } from 'lucide-react';
import { toggleAmbient, isAmbientEnabled } from '@/lib/ambient-audio';
import { LangToggle } from '@/components/ui/LangToggle';
import { useLanguage } from '@/i18n';

interface Props {
  onLogout?: () => void;
  hidden?: boolean;
}

export const Header: React.FC<Props> = ({ onLogout, hidden = false }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [ambientOn, setAmbientOn] = useState(() => isAmbientEnabled());

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 safe-top"
      style={{
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        opacity: hidden ? 0 : 1,
        transition: hidden
          ? 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 0.3s ease-out, opacity 0.2s ease-out',
      }}
    >
      {/* PERF FIX: replaced glass-strong with solid bg on non-home pages.
          backdrop-filter: blur(40px) on a sticky header recalculates every scroll frame. */}
      <div
        className={`flex items-center justify-between px-4 py-3 transition-[background-color,border-color] duration-500 ${
          isHome
            ? 'bg-gradient-to-b from-black/30 via-black/10 to-transparent'
            : 'backdrop-blur-lg bg-[rgba(10,10,10,0.55)] border-b border-white/[0.04]'
        }`}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-baseline group"
        >
          <span className="text-[20px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
          <span className="text-[16px] font-light tracking-wide text-white/50" style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '1px' }}>tivi</span>
          <span className="text-primary-light text-[13px] font-bold" style={{ marginLeft: '2px' }}>+</span>
        </button>
        {/* Welcome — only on Home */}
        {isHome && (
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <span className="text-[12px] font-light tracking-[5px] uppercase" style={{ animation: 'welcome-blink 6s ease-in-out infinite', color: 'rgba(255,255,255,0.35)' }}>{t('welcome')}</span>
          </div>
        )}

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { path: '/', label: t('navHome') },
            { path: '/live', label: t('navLiveTV') },
            { path: '/movies', label: t('navMovies') },
            { path: '/series', label: t('navSeries') },
            { path: '/french', label: t('navFrench') },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-[color,background-color] duration-300 ${
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
            data-ambient-toggle
            onClick={() => {
              const on = toggleAmbient();
              setAmbientOn(on);
            }}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            title={ambientOn ? t('muteAmbient') : t('playAmbient')}
          >
            {ambientOn ? (
              <svg width="18" height="16" viewBox="0 0 18 16" className="text-primary-light">
                <path d="M1 8 Q3 2, 5 8 Q7 14, 9 8 Q11 2, 13 8 Q15 14, 17 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
                <path d="M1 8 Q3 4, 5 8 Q7 12, 9 8 Q11 4, 13 8 Q15 12, 17 8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
              </svg>
            ) : (
              <svg width="18" height="16" viewBox="0 0 18 16" className="text-white/30">
                <line x1="1" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <LangToggle />
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl glass-light flex items-center justify-center hover:bg-white/10 transition-colors"
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
