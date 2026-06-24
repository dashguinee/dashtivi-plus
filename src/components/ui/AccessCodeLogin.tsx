import React, { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t, useLanguage } from '@/i18n';
import { onPreloadProgress, getPreloadProgress } from '@/lib/preloader';

interface Props {
  /** Primary gate — DASH ID + PIN. */
  onLoginPin: (id: string, pin: string) => Promise<{ success: boolean; guest?: boolean; error?: string }>;
  /** Legacy fallback — single DASH-XXXX access code. */
  onLogin: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export const AccessCodeLogin: React.FC<Props> = ({ onLoginPin, onLogin }) => {
  const { lang } = useLanguage();

  // Primary: DASH ID + PIN
  const [dashId, setDashId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Legacy: single access code (revealed via secondary link)
  const [showLegacy, setShowLegacy] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(getPreloadProgress);

  // Subscribe to preload progress updates
  useEffect(() => onPreloadProgress(setProgress), []);

  const handleSubmitPin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dashId.trim() || !pin.trim()) {
        setError('Enter your DASH ID and PIN');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const result = await onLoginPin(dashId, pin);
        if (!result.success) {
          setError(result.error ?? 'Invalid DASH ID or PIN');
          setLoading(false);
        }
        // success (active OR guest) → App swaps this screen out; nothing to do.
      } catch {
        setError(t(lang, 'connectionError'));
        setLoading(false);
      }
    },
    [dashId, pin, onLoginPin, lang]
  );

  const handleSubmitLegacy = useCallback(
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
    [code, onLogin, lang]
  );

  const inputBase =
    'w-full py-4 px-5 bg-white/[0.07] border border-white/[0.12] rounded-xl text-white text-[15px] outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-white/35 focus:border-primary/70 focus:bg-white/[0.09] focus:shadow-[inset_0_0_0_1px_rgba(157,78,221,0.2),0_0_0_3px_rgba(157,78,221,0.2)]';

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
      <div className="relative z-10 flex items-center justify-center w-full h-full px-5 md:px-0">
        <div className="login-box-appear w-full max-w-[400px]">

          {/* Logo — DASHtivi+ brand */}
          <div className="text-center mb-10">
            <h1 className="mb-3">
              <span className="text-[34px] font-bold uppercase text-white" style={{ fontFamily: "'Clash Display', 'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>DASH</span>
              <span className="text-[26px] font-light text-white/55" style={{ fontFamily: "'Clash Display', 'Outfit', sans-serif", letterSpacing: '-0.01em' }}>tivi</span>
              <span className="text-[22px] font-bold ml-0.5" style={{ background: 'linear-gradient(135deg, #C77DFF, #22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>+</span>
            </h1>
            <p className="text-[11px] text-white/40 tracking-[4px] uppercase font-light" style={{ textShadow: '0 0 6px rgba(157,78,221,0.2)' }}>
              {t(lang, 'premiumStreaming')}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(10,10,15,0.9) 40%, rgba(157,78,221,0.03) 100%)',
              border: '1px solid rgba(157,78,221,0.1)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(157,78,221,0.08)',
            }}
          >
            {!showLegacy ? (
              /* ── PRIMARY GATE: DASH ID + PIN ────────────────────── */
              <form onSubmit={handleSubmitPin} className="space-y-5">
                <label className="block text-[12px] text-white/50 font-medium tracking-wide uppercase ml-1 pt-px">
                  Access Code
                </label>

                {/* DASH ID */}
                <div>
                  <input
                    type="text"
                    value={dashId}
                    onChange={(e) => { setDashId(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="DASH ID  ·  e.g. 001AA"
                    autoFocus
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className={inputBase}
                    style={{ fontFamily: "'Space Grotesk', monospace", letterSpacing: '0.05em' }}
                  />
                </div>

                {/* PIN */}
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(''); }}
                    placeholder="PIN"
                    inputMode="numeric"
                    autoComplete="off"
                    className={`${inputBase} pr-12`}
                    style={{ fontFamily: "'Space Grotesk', monospace", letterSpacing: '0.3em' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <p className="text-red-400/80 text-[12px] text-center font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`dash-gold-btn relative overflow-hidden w-full py-4 rounded-xl font-black text-[13px] leading-none tracking-[2px] uppercase transition-[transform,opacity,background] duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:transform-none ${loading ? 'dash-gold-btn--loading' : ''}`}
                  style={{
                    color: '#1a1400',
                    background: loading
                      ? 'linear-gradient(135deg, #E6CB86 0%, #D9B45A 42%, #B89A52 100%)'
                      : 'linear-gradient(135deg, #DDB962 0%, #C9A14A 42%, #9D7E3C 100%)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 18px rgba(157,78,221,0.10), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 text-black/70">
                      <span className="w-4 h-4 border-2 border-black/25 border-t-black/70 rounded-full dash-spin-pulse" />
                      {progress < 1 ? 'Preparing...' : t(lang, 'verifying')}
                    </span>
                  ) : (
                    t(lang, 'enter')
                  )}
                </button>

                {/* Secondary: legacy access-code reveal */}
                <button
                  type="button"
                  onClick={() => { setShowLegacy(true); setError(''); }}
                  className="dash-secondary-link group w-full text-center text-[11px] text-white/40 hover:text-white/60 transition-colors tracking-wide"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <span className="group-hover:underline underline-offset-4 decoration-white/30">Have a DASH-XXXX code?</span>
                  <span className="inline-block ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">→</span>
                </button>
              </form>
            ) : (
              /* ── LEGACY GATE: single access code ────────────────── */
              <form onSubmit={handleSubmitLegacy} className="space-y-5">
                <label className="block text-[12px] text-white/50 font-medium tracking-wide uppercase ml-1 pt-px">
                  {t(lang, 'accessCode')}
                </label>
                <div className="relative">
                  <input
                    type={showCode ? 'text' : 'password'}
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(''); }}
                    placeholder="DASH-SL-001"
                    autoFocus
                    className={`${inputBase} pr-12`}
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

                {error && (
                  <p className="text-red-400/80 text-[12px] text-center font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`dash-gold-btn relative overflow-hidden w-full py-4 rounded-xl font-black text-[13px] leading-none tracking-[2px] uppercase transition-[transform,opacity,background] duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:transform-none ${loading ? 'dash-gold-btn--loading' : ''}`}
                  style={{
                    color: '#1a1400',
                    background: loading
                      ? 'linear-gradient(135deg, #E6CB86 0%, #D9B45A 42%, #B89A52 100%)'
                      : 'linear-gradient(135deg, #DDB962 0%, #C9A14A 42%, #9D7E3C 100%)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 18px rgba(157,78,221,0.10), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 text-black/70">
                      <span className="w-4 h-4 border-2 border-black/25 border-t-black/70 rounded-full dash-spin-pulse" />
                      {progress < 1 ? 'Preparing...' : t(lang, 'verifying')}
                    </span>
                  ) : (
                    t(lang, 'enter')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowLegacy(false); setError(''); }}
                  className="w-full text-center text-[11px] text-white/40 hover:text-white/60 transition-colors tracking-wide"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  ← Use DASH ID + PIN
                </button>
              </form>
            )}
          </div>

          {/* Preload progress — the "F1 pit lane" bar */}
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <div className="w-24 h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: progress >= 1
                    ? 'rgba(157,78,221,0.6)'
                    : 'linear-gradient(90deg, rgba(157,78,221,0.45), rgba(199,125,255,0.85))',
                  boxShadow: progress > 0 && progress < 1 ? '0 0 8px rgba(157,78,221,0.3)' : 'none',
                }}
              />
            </div>
            <p className="text-white/25 text-[10px] tracking-[3px] uppercase font-light text-center leading-snug px-2">
              {loading ? t(lang, 'verifying') : progress >= 1 ? t(lang, 'enterCodeFromDash') : 'Loading'}
            </p>
          </div>

          {/* Join DASH — the become-a-member route (create a free DASH ID via
              WhatsApp). The ONLY way in besides logging in; no anonymous browse.
              Bronze-gold = the premium/pride door to DASH. */}
          <div className="mt-7 flex flex-col items-center gap-2.5">
            <p className="text-[11px] text-white/40 tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {lang === 'fr' ? 'Pas encore membre ?' : 'Not a member yet?'}
            </p>
            <a
              href={`https://wa.me/224611361300?text=${encodeURIComponent(t(lang, 'joinDashWhatsappPrefill'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dash-gold-btn relative overflow-hidden w-full text-center py-3.5 rounded-xl text-[13px] font-black leading-none tracking-[1.5px] uppercase transition-transform duration-300 active:scale-[0.98]"
              style={{
                color: '#1a1400',
                background: 'linear-gradient(135deg, #DDB962 0%, #C9A14A 42%, #9D7E3C 100%)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.32), 0 0 16px rgba(157,78,221,0.09), inset 0 1px 0 rgba(255,255,255,0.15)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {lang === 'fr' ? 'Rejoindre DASH' : 'Join DASH'}
            </a>
          </div>

          {/* Bronze-gold shimmer — the premium sheen on every DASH action button. */}
          <style>{`
            @keyframes dash-gold-sweep { 0% { background-position: -180% 0; } 100% { background-position: 180% 0; } }
            .dash-gold-btn::after {
              content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
              background: linear-gradient(110deg, transparent 36%, rgba(255,255,255,0.32) 50%, transparent 64%);
              background-size: 220% 100%; animation: dash-gold-sweep 3.4s ease-in-out infinite;
            }
            .dash-gold-btn--loading { opacity: 0.92; }
            @keyframes dash-spin-rot { to { transform: rotate(360deg); } }
            @keyframes dash-spin-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            .dash-spin-pulse { animation: dash-spin-rot 0.7s linear infinite, dash-spin-pulse 1.2s ease-in-out infinite; }
          `}</style>
        </div>
      </div>
    </div>
  );
};
