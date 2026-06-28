import React, { useState, useEffect, useRef } from 'react';
import { preloadReady, getLogoProgress, onLogoProgress } from '@/lib/preloader';

interface Props {
  onComplete: () => void;
  authReady?: boolean;
}

export const SplashScreen: React.FC<Props> = ({ onComplete, authReady = true }) => {
  const [phase, setPhase] = useState<'dark' | 'brand' | 'ready' | 'exit'>('dark');
  // Determinate progress hint (0→1): the share of the ~600 logos cached so far.
  // Lets the existing loading bar quietly fill while the shell front-loads.
  const [progress, setProgress] = useState(() => getLogoProgress());
  const authRef = useRef(authReady);
  authRef.current = authReady;

  useEffect(() => {
    // verbose: '[SPLASH] Starting'
    // Remove the HTML pre-splash (it served its purpose — no white flash)
    document.getElementById('pre-splash')?.remove();

    // Reflect logo-warm progress on the bar (subtle hint, no redesign).
    const offProgress = onLogoProgress(setProgress);

    // Phase 1: dark → brand
    const t1 = setTimeout(() => setPhase('brand'), 500);

    // Phase 2: HOLD the splash until the app is TRULY fully loaded — the shell,
    // the catalog AND every channel logo cached on-device — so the moment the
    // interface is revealed it's complete + instant + offline-ready, and stays
    // that way forever (only the video stream ever loads after this). This is a
    // deliberate, one-time, slightly-longer FIRST splash for a forever-instant
    // app; the preload budget (in the preloader) caps it so it can never hang.
    const minBrandTime = new Promise<void>(r => setTimeout(r, 1300));

    Promise.all([minBrandTime, preloadReady]).then(() => {
      // verbose: '[SPLASH] Assets ready'
      const authStart = Date.now();
      const proceed = () => {
        // verbose: '[SPLASH] Proceeding'
        setPhase('ready');
        setTimeout(() => setPhase('exit'), 320);
        // onComplete just after the 500ms opacity fade finishes — no dead air.
        setTimeout(() => onComplete(), 900);
      };
      const waitForAuth = () => {
        if (authRef.current || Date.now() - authStart > 1800) {
          proceed();
        } else {
          setTimeout(waitForAuth, 80);
        }
      };
      waitForAuth();
    });

    // Failsafe — absolute ceiling so a dead network can never trap the user on
    // the splash. Sits just past the splash's logo hold (preloader caps at ~8s).
    const failsafe = setTimeout(() => { onComplete(); }, 9000);

    return () => { clearTimeout(t1); clearTimeout(failsafe); offProgress(); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#060609' }}
    >
      {/* Purple pulse */}
      <div
        className="absolute rounded-full transition-[transform,opacity] duration-[2000ms] ease-out"
        style={{
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(157,78,221,0.08) 0%, transparent 60%)',
          transform: phase === 'dark' ? 'scale(0)' : phase === 'ready' || phase === 'exit' ? 'scale(1.5)' : 'scale(1)',
          opacity: phase === 'exit' ? 0 : phase === 'dark' ? 0 : 1,
        }}
      />

      {/* Wordmark */}
      <div
        className={`relative z-10 text-center transition-[opacity,transform] duration-500 ${
          phase === 'dark' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <h1>
          <span className="text-[36px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
          <span className="text-[26px] font-light tracking-wide text-white/40" style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '2px' }}>tivi</span>
          <span className="text-primary-light text-[18px] font-bold ml-1">+</span>
        </h1>
        <p
          className={`mt-2 text-[11px] font-light tracking-[0.25em] uppercase transition-opacity duration-1000 ${
            phase === 'ready' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ color: 'rgba(255,255,255,0.18)', fontFamily: "'Outfit', sans-serif" }}
        >
          Bring Joy
        </p>

        {/* Loading bar — determinate once logo-warm starts (fills 0→100% as the
            ~600 logos cache), falling back to the gentle pulse before then. */}
        <div
          className={`mt-5 mx-auto w-12 h-[2px] rounded-full overflow-hidden transition-opacity duration-500 ${
            phase === 'brand' || phase === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {progress > 0 ? (
            <div
              className="h-full bg-primary/50 rounded-full origin-left transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          ) : (
            <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
          )}
        </div>

      </div>
    </div>
  );
};
