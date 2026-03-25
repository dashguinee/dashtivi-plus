import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'dark' | 'brand' | 'ready' | 'exit'>('dark');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('brand'), 500),
      setTimeout(() => setPhase('ready'), 3500),
      setTimeout(() => setPhase('exit'), 4500),
      setTimeout(() => onComplete(), 5200),
      setTimeout(() => onComplete(), 10000), // failsafe
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#060609' }}
    >
      {/* Purple pulse — expands slowly */}
      <div
        className="absolute rounded-full transition-all duration-[2000ms] ease-out"
        style={{
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(157,78,221,0.1) 0%, transparent 60%)',
          transform: phase === 'dark' ? 'scale(0)' : phase === 'ready' || phase === 'exit' ? 'scale(1.5)' : 'scale(1)',
          opacity: phase === 'exit' ? 0 : phase === 'dark' ? 0 : 1,
        }}
      />

      {/* Wordmark */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          phase === 'dark' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <h1>
          <span className="text-[36px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
          <span className="text-[26px] font-light tracking-wide text-white/40" style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '2px' }}>tivi</span>
          <span className="text-primary-light text-[18px] font-bold ml-1">+</span>
        </h1>

        {/* Loading bar — appears after brand, shows progress */}
        <div
          className={`mt-5 mx-auto w-12 h-[2px] rounded-full overflow-hidden transition-opacity duration-500 ${
            phase === 'brand' ? 'opacity-100' : phase === 'ready' || phase === 'exit' ? 'opacity-0' : 'opacity-0'
          }`}
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="h-full w-full bg-primary/40 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  );
};
