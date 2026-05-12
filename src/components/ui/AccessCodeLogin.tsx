import React, { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import { onPreloadProgress, getPreloadProgress } from '@/lib/preloader';

interface Props {
  onLogin: (code: string) => Promise<{ success: boolean; error?: string }>;
  onGuest?: () => void;
}

export const AccessCodeLogin: React.FC<Props> = ({ onLogin, onGuest }) => {
  const { lang } = useLanguage();
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(getPreloadProgress);

  // Subscribe to preload progress updates
  useEffect(() => onPreloadProgress(setProgress), []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) {
        setError(t(lang, 'pleaseEnterCode'));
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await onLogin(code);
        if (!result.success) {
          setError(result.error ?? t(lang, 'invalidCode'));
          setLoading(false);
        }
      } catch {
        setError(t(lang, 'connectionError'));
        setLoading(false);
      }
    },
    [code, onLogin]
  );

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Background — dark cosmos with purple nebula */}
      <div className="absolute inset-0 bg-[#060609]" />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(157,78,221,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(157,78,221,0.06) 0%, transparent 50%)',
      }} />

      {/* Floating particles */}
      <div className="login-particles">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      {/* Login content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-5">
        <div className="login-box-appear w-full max-w-[400px]">

          {/* Logo — DASHtivi+ brand */}
          <div className="text-center mb-10">
            <h1 className="mb-3">
              <span className="text-[32px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
              <span className="text-[24px] font-light tracking-wide text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>tivi</span>
              <span className="text-primary-light text-[18px] font-bold ml-0.5">+</span>
            </h1>
            <p className="text-[11px] text-white/20 tracking-[5px] uppercase font-light">
              {t(lang, 'premiumStreaming')}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(10,10,15,0.9) 40%, rgba(157,78,221,0.03) 100%)',
              border: '1px solid rgba(157,78,221,0.1)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(157,78,221,0.08)',
            }}
          >
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] text-white/30 font-medium tracking-wide uppercase mb-2 ml-1">
                  {t(lang, 'accessCode')}
                </label>
                <div className="relative">
                  <input
                    type={showCode ? 'text' : 'password'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="DASH-SL-001"
                    autoFocus
                    className="w-full py-4 px-5 pr-12 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-[15px] outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-white/20 focus:border-primary/40 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(157,78,221,0.1)]"
                    style={{ fontFamily: "'Space Grotesk', monospace" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400/80 text-[12px] text-center font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-[13px] tracking-[2px] uppercase transition-[transform,opacity] duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white"
                style={{
                  background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                  boxShadow: '0 4px 20px rgba(157,78,221,0.3), 0 0 30px rgba(157,78,221,0.15)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {progress < 1 ? 'Preparing...' : t(lang, 'verifying')}
                  </span>
                ) : (
                  t(lang, 'enter')
                )}
              </button>
            </form>
          </div>

          {/* Preload progress — the "F1 pit lane" bar */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="w-24 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: progress >= 1
                    ? 'rgba(157,78,221,0.5)'
                    : 'linear-gradient(90deg, rgba(157,78,221,0.3), rgba(199,125,255,0.6))',
                }}
              />
            </div>
            <p className="text-white/10 text-[9px] tracking-[4px] uppercase font-light">
              {loading ? t(lang, 'verifying') : progress >= 1 ? t(lang, 'enterCodeFromDash') : 'Loading'}
            </p>
          </div>

          {/* Guest mode + WhatsApp */}
          {onGuest && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={onGuest}
                className="px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 active:scale-95"
                style={{
                  background: 'rgba(157,78,221,0.08)',
                  border: '1px solid rgba(157,78,221,0.2)',
                  color: 'rgba(199,125,255,0.75)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Browse as Guest
              </button>
              <a
                href="https://wa.me/224611361300?text=Hi%20DASH%2C%20I%20want%20a%20Tivi%2B%20code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium tracking-wide"
                style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Outfit', sans-serif" }}
              >
                Get your code on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
