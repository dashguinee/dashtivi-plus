import React, { useState, useEffect, useRef } from 'react';
import { preloadReady } from '@/lib/preloader';

interface Props {
  onComplete: () => void;
  authReady?: boolean;
}

export const SplashScreen: React.FC<Props> = ({ onComplete, authReady = true }) => {
  const [phase, setPhase] = useState<'dark' | 'brand' | 'ready' | 'exit'>('dark');
  const authRef = useRef(authReady);
  authRef.current = authReady;

  useEffect(() => {
    console.log('[SPLASH] Starting — authReady:', authReady);
    // Remove the HTML pre-splash (it served its purpose — no white flash)
    document.getElementById('pre-splash')?.remove();

    // Phase 1: dark → brand
    const t1 = setTimeout(() => setPhase('brand'), 300);

    // Phase 2: wait for assets + minimum brand time (auth has 3s max)
    const minBrandTime = new Promise<void>(r => setTimeout(r, 2200));

    Promise.all([minBrandTime, preloadReady]).then(() => {
      console.log('[SPLASH] Assets ready — waiting for auth (3s max)');
      const authStart = Date.now();
      const proceed = () => {
        console.log('[SPLASH] Proceeding — authReady:', authRef.current);
        setPhase('ready');
        setTimeout(() => setPhase('exit'), 500);
        setTimeout(() => onComplete(), 1100);
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
    const failsafe = setTimeout(() => { console.log('[SPLASH] Failsafe triggered'); onComplete(); }, 6000);

    return () => { clearTimeout(t1); clearTimeout(failsafe); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-600 ${
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
        className={`relative z-10 text-center transition-[opacity,transform] duration-600 ${
          phase === 'dark' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <h1>
          <span className="text-[36px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
          <span className="text-[26px] font-light tracking-wide text-white/40" style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '2px' }}>tivi</span>
          <span className="text-primary-light text-[18px] font-bold ml-1">+</span>
        </h1>

        {/* Loading bar */}
        <div
          className={`mt-5 mx-auto w-12 h-[2px] rounded-full overflow-hidden transition-opacity duration-500 ${
            phase === 'brand' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
};
