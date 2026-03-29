import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tv, Sparkles, Play, Wifi, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { t, useLanguage } from '@/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

const GENRES_EN = ['Action', 'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi'];
const GENRES_FR = ['Action', 'Drame', 'Comédie', 'Thriller', 'Romance', 'Sci-Fi'];

const GENRE_GRADIENTS = [
  'from-red-900/80 to-orange-900/60',
  'from-blue-900/80 to-indigo-900/60',
  'from-yellow-900/80 to-amber-900/60',
  'from-slate-900/80 to-zinc-800/60',
  'from-pink-900/80 to-rose-900/60',
  'from-cyan-900/80 to-teal-900/60',
];

export const WelcomePage: React.FC = () => {
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const prefillCode = searchParams.get('code') || '';
  const GENRES = lang === 'fr' ? GENRES_FR : GENRES_EN;

  const [code, setCode] = useState(prefillCode);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // If code param is present, auto-show login
  useEffect(() => {
    if (prefillCode) setShowLogin(true);
  }, [prefillCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(t(lang, 'pleaseEnterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(code);
      if (!result.success) {
        setError(result.error ?? t(lang, 'invalidCode'));
        setLoading(false);
      }
    } catch {
      setError(t(lang, 'connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
      {/* ── Ambient background ────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(157,78,221,0.18)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(255,107,53,0.08)_0%,transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(0,168,225,0.05)_0%,transparent_50%)]" />
      </div>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
              boxShadow: '0 0 24px rgba(157,78,221,0.4)',
            }}
          >
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide flex items-baseline gap-0.5">
            <span className="text-gradient">DashTivi</span>
            <span className="text-primary-light text-sm font-black">+</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button
            onClick={() => setShowLogin(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 hover:border-primary/40 hover:bg-white/5 transition-[border-color,background-color] duration-300"
          >
            {t(lang, 'signIn')}
          </button>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-5 sm:px-8 pt-8 pb-16 sm:pt-16 sm:pb-24 max-w-4xl mx-auto">
        <div className="animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse-live" />
            <span className="text-xs font-medium text-text-secondary tracking-wide">
              {t(lang, 'showmaxBadge')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5">
            <span className="text-white">{t(lang, 'heroTitle1')}</span>
            <br />
            <span className="text-gradient">{t(lang, 'heroTitle2')}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-text-secondary max-w-xl mb-8 leading-relaxed">
            {t(lang, 'heroSubtitle')}{' '}
            <span className="text-white font-semibold">{t(lang, 'heroPrice')}</span>
          </p>

          {/* CTA */}
          <button
            onClick={() => setShowLogin(true)}
            className="btn-sweep group flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-base tracking-wide transition-transform duration-300 hover:-translate-y-0.5 text-white"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
              boxShadow: '0 4px 30px rgba(157,78,221,0.4), 0 0 60px rgba(157,78,221,0.15)',
            }}
          >
            <Play className="w-5 h-5" />
            {t(lang, 'heroCTA')}
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="mt-4 text-sm text-text-muted">
            {t(lang, 'heroFooter')}
          </p>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Sparkles className="w-6 h-6 text-primary-light" />, titleKey: 'veeSmartPicks' as const, descKey: 'veeSmartPicksDesc' as const },
            { icon: <Play className="w-6 h-6 text-accent" />, titleKey: 'youtubeTrailers' as const, descKey: 'youtubeTrailersDesc' as const },
            { icon: <Wifi className="w-6 h-6 text-accent-green" />, titleKey: 'worksOn3G' as const, descKey: 'worksOn3GDesc' as const },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 glass-light border border-white/[0.06] hover:border-primary/20 transition-[border-color,background-color] duration-300 hover:bg-white/[0.04] group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{t(lang, f.titleKey)}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{t(lang, f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTENT PREVIEW ───────────────────────────────────── */}
      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-20 max-w-4xl mx-auto">
        <div className="section-glow pt-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t(lang, 'whatsStreaming')}</h2>
          <p className="text-text-secondary text-sm mb-8">{t(lang, 'whatsStreamingDesc')}</p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {GENRES.map((genre, i) => (
              <div
                key={genre}
                className={`aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br ${GENRE_GRADIENTS[i]} border border-white/[0.08] flex flex-col items-center justify-center p-3 group hover:scale-[1.03] hover:border-primary/30 transition-[transform,border-color] duration-300 cursor-pointer`}
                onClick={() => setShowLogin(true)}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                  <Play className="w-4 h-4 text-white/70 ml-0.5" />
                </div>
                <span className="text-xs font-semibold text-white/80 text-center">{genre}</span>
                <span className="mt-1 text-[8px] font-bold tracking-[2px] text-white/25 uppercase">
                  DASH+
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section className="relative z-10 px-5 sm:px-8 pb-16 sm:pb-24 max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 sm:p-10 text-center glass-strong border border-primary/20"
          style={{
            boxShadow: '0 0 60px rgba(157,78,221,0.1), 0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            <span className="text-xs font-semibold text-accent-green">{t(lang, 'first48Free')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            <span className="text-white">$3</span>
            <span className="text-text-muted text-lg font-medium">{t(lang, 'perMonth')}</span>
          </h2>

          <p className="text-text-secondary text-base mb-6 max-w-md mx-auto">
            {t(lang, 'pricingDesc')}
          </p>

          <button
            onClick={() => setShowLogin(true)}
            className="btn-sweep inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-transform duration-300 hover:-translate-y-0.5 text-white"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
              boxShadow: '0 4px 20px rgba(157,78,221,0.4)',
            }}
          >
            <Play className="w-4 h-4" />
            {t(lang, 'startFreeTrial')}
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-5 sm:px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            {t(lang, 'poweredByDash')} <span className="text-text-secondary font-medium">{t(lang, 'dashLifestyle')}</span>
          </p>
          <nav className="flex items-center gap-6">
            {[
              t(lang, 'navHome'),
              t(lang, 'navLiveTV'),
              t(lang, 'navMovies'),
              t(lang, 'navSeries'),
            ].map((label) => (
              <button
                key={label}
                onClick={() => setShowLogin(true)}
                className="text-xs text-text-muted hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </footer>

      {/* ── ACCESS CODE MODAL ─────────────────────────────────── */}
      {showLogin && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowLogin(false); setError(''); }}
          />

          {/* Floating particles */}
          <div className="login-particles">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="login-particle" />
            ))}
          </div>

          {/* Modal */}
          <div
            className="login-box-appear relative z-10 w-full max-w-[420px] mx-5 rounded-3xl p-10 glass-strong border border-primary/20"
            style={{
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(157,78,221,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => { setShowLogin(false); setError(''); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-text-muted hover:text-white"
            >
              &times;
            </button>

            {/* Logo */}
            <div className="text-center mb-8">
              <div
                className="logo-pulse inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                  background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                  boxShadow: '0 0 30px rgba(157,78,221,0.5), 0 0 60px rgba(157,78,221,0.3)',
                }}
              >
                <Tv className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-wider mb-1">
                <span className="text-gradient">DashTivi</span>
                <span className="text-primary-light text-lg font-black">+</span>
              </h2>
              <p className="text-text-secondary text-sm">{t(lang, 'enterTrialCode')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <input
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FREE-A1B2"
                  autoFocus
                  className="w-full py-[16px] px-5 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-[14px] text-white text-base outline-none transition-[border-color,background-color,box-shadow] duration-300 placeholder:text-white/35 focus:border-primary focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(157,78,221,0.15),0_0_20px_rgba(157,78,221,0.2)]"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-sweep w-full py-[16px] rounded-[14px] font-bold text-sm tracking-[1.5px] uppercase transition-[transform,opacity] duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white"
                style={{
                  background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                  boxShadow: '0 4px 20px rgba(157,78,221,0.4), 0 0 40px rgba(157,78,221,0.2)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t(lang, 'verifyingLogin')}
                  </span>
                ) : (
                  t(lang, 'startWatching')
                )}
              </button>
            </form>

            <p className="mt-6 text-text-muted text-xs text-center">
              {t(lang, 'freeTrialNote')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
