import React, { useState, useEffect, useRef } from 'react';
import { preloadReady } from '@/lib/preloader';

interface Props {
  onComplete: () => void;
  onGuest?: () => void;
  authReady?: boolean;
}

export const SplashScreen: React.FC<Props> = ({ onComplete, onGuest, authReady = true }) => {
  const [phase, setPhase] = useState<'dark' | 'brand' | 'ready' | 'exit'>('dark');
  const authRef = useRef(authReady);
  authRef.current = authReady;

  useEffect(() => {
    // verbose: '[SPLASH] Starting'
    // Remove the HTML pre-splash (it served its purpose — no white flash)
    document.getElementById('pre-splash')?.remove();

    // Phase 1: dark → brand
    const t1 = setTimeout(() => setPhase('brand'), 500);

    // Phase 2: wait for assets + minimum brand time (auth has 3s max)
    const minBrandTime = new Promise<void>(r => setTimeout(r, 2800));

    Promise.all([minBrandTime, preloadReady]).then(() => {
      // verbose: '[SPLASH] Assets ready'
      const authStart = Date.now();
      const proceed = () => {
        // verbose: '[SPLASH] Proceeding'
        setPhase('ready');
        setTimeout(() => setPhase('exit'), 700);
        setTimeout(() => onComplete(), 2600);
      };
      const waitForAuth = () => {
        if (authRef.current || Date.now() - authStart > 3000) {
          proceed();
        } else {
          setTimeout(waitForAuth, 80);
        }
      };
      waitForAuth();
    });

    // Failsafe — never stuck longer than 6s
    const failsafe = setTimeout(() => { onComplete(); }, 6000);

    return () => { clearTimeout(t1); clearTimeout(failsafe); };
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

        {/* Loading bar */}
        <div
          className={`mt-5 mx-auto w-12 h-[2px] rounded-full overflow-hidden transition-opacity duration-500 ${
            phase === 'brand' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
        </div>

        {/* Guest mode + WhatsApp CTA */}
        {onGuest && (
          <div
            className={`mt-8 flex flex-col items-center gap-3 transition-opacity duration-700 ${
              phase === 'ready' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={onGuest}
              className="px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95"
              style={{
                background: 'rgba(157,78,221,0.12)',
                border: '1px solid rgba(157,78,221,0.25)',
                color: 'rgba(199,125,255,0.9)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Browse as Guest
            </button>
            <a
              href="https://wa.me/YOUR_NUMBER?text=Hi%20DASH%2C%20I%20want%20a%20Tivi%2B%20code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium tracking-wide"
              style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif" }}
            >
              Get your code on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
