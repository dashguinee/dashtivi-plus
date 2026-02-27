import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export const CinematicLogin: React.FC<Props> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      // Simple password gate — "dash" or "tivi" or empty for now
      setTimeout(() => {
        if (!password || password.toLowerCase() === 'dash' || password.toLowerCase() === 'tivi') {
          onLogin();
        } else {
          setError('Invalid access code');
          setLoading(false);
        }
      }, 800);
    },
    [password, onLogin]
  );

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Background gradient — OG's radial purple/cyan depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(157,78,221,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(0,245,255,0.1)_0%,transparent_40%),linear-gradient(to_bottom,rgba(10,10,26,0.3)_0%,rgba(10,10,26,0.95)_100%)]" />

      {/* Floating particles — the OG's soul */}
      <div className="login-particles">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      {/* Login content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-5">
        <div className="login-box-appear w-full max-w-[420px] rounded-3xl p-12 px-10 glass-strong border border-primary/20"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(157,78,221,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Logo — OG's gold-glow pulse */}
          <div className="text-center mb-9">
            <div className="logo-pulse inline-block text-6xl mb-3" style={{
              textShadow: '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.2)',
            }}>
              ⚡
            </div>
            <h1 className="text-[42px] font-extrabold tracking-[6px] mb-2 text-gradient-cosmic title-shimmer">
              TIVI<span className="text-accent text-3xl">+</span>
            </h1>
            <p className="text-text-secondary text-sm tracking-[3px] uppercase opacity-80">
              Your Streaming Universe
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Access Code"
                className="w-full py-[18px] px-5 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-[14px] text-white text-base outline-none transition-all duration-300 placeholder:text-white/35 focus:border-primary focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(157,78,221,0.15),0_0_20px_rgba(157,78,221,0.2)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-sweep w-full py-[18px] bg-gradient-to-br from-primary to-primary-dark text-white rounded-[14px] font-bold text-base tracking-[2px] uppercase transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                backgroundSize: '200% 200%',
                boxShadow: '0 4px 20px rgba(157,78,221,0.4), 0 0 40px rgba(157,78,221,0.2)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entering...
                </span>
              ) : (
                'Enter TIVI+'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-text-muted text-xs">
              Press Enter or tap the button to continue
            </p>
            <p className="text-text-muted text-[10px] mt-2 tracking-wider uppercase">
              DASH Lifestyle &bull; West Africa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
