import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'dark' | 'brand' | 'exit'>('dark');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('brand'), 200),
      setTimeout(() => setPhase('exit'), 1800),
      setTimeout(() => onComplete(), 2400),
      setTimeout(() => onComplete(), 6000), // failsafe
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-600 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#060609' }}
    >
      {/* Single purple pulse — subtle, no particles */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full transition-all duration-[1200ms]"
        style={{
          background: 'radial-gradient(circle, rgba(157,78,221,0.12) 0%, transparent 60%)',
          transform: phase === 'dark' ? 'scale(0)' : 'scale(1)',
          opacity: phase === 'exit' ? 0 : 1,
        }}
      />

      {/* Brand — just the wordmark, nothing else */}
      <div
        className={`relative z-10 transition-all duration-700 ${
          phase === 'dark'
            ? 'opacity-0 scale-95'
            : 'opacity-100 scale-100'
        }`}
      >
        <h1 className="text-center">
          <span
            className="text-[36px] font-black tracking-tight text-white uppercase"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            DASH
          </span>
          <span
            className="text-[26px] font-light tracking-wide text-white/40"
            style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '2px' }}
          >
            tivi
          </span>
          <span className="text-primary-light text-[18px] font-bold ml-1">+</span>
        </h1>
      </div>
    </div>
  );
};
