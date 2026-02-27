import React, { useState, useEffect } from 'react';

/**
 * SplashScreen — Cinematic intro that plays on first visit.
 * Logo materializes from particles, purple glow expands, tagline fades in,
 * then the whole thing dissolves into the app.
 */
interface Props {
  onComplete: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'dark' | 'glow' | 'logo' | 'tagline' | 'exit'>('dark');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('glow'), 300),
      setTimeout(() => setPhase('logo'), 800),
      setTimeout(() => setPhase('tagline'), 1600),
      setTimeout(() => setPhase('exit'), 3000),
      setTimeout(() => onComplete(), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#050508] transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Central glow */}
      <div
        className={`absolute w-[500px] h-[500px] rounded-full transition-all duration-1000 ${
          phase === 'dark'
            ? 'scale-0 opacity-0'
            : phase === 'glow'
            ? 'scale-50 opacity-30'
            : 'scale-100 opacity-40'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(157, 78, 221, 0.5) 0%, rgba(157, 78, 221, 0.1) 40%, transparent 70%)',
        }}
      />

      {/* Secondary glow — accent */}
      <div
        className={`absolute w-[300px] h-[300px] rounded-full transition-all duration-1200 delay-300 ${
          phase === 'dark' || phase === 'glow'
            ? 'scale-0 opacity-0'
            : 'scale-100 opacity-20'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(255, 107, 53, 0.4) 0%, transparent 60%)',
          transform: 'translate(100px, 50px)',
        }}
      />

      {/* Particle ring */}
      <div className={`absolute transition-all duration-1000 ${
        phase === 'dark' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const radius = phase === 'logo' || phase === 'tagline' || phase === 'exit' ? 0 : 120;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary-light transition-all"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transitionDuration: `${600 + i * 30}ms`,
                transitionDelay: `${i * 20}ms`,
                opacity: phase === 'exit' ? 0 : phase === 'dark' ? 0 : 0.8,
              }}
            />
          );
        })}
      </div>

      {/* Logo */}
      <div className="relative z-10 text-center">
        {/* Play icon */}
        <div
          className={`mx-auto mb-4 transition-all duration-700 ${
            phase === 'dark' || phase === 'glow'
              ? 'scale-0 opacity-0 rotate-180'
              : 'scale-100 opacity-100 rotate-0'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/50 splash-logo-glow">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white ml-1">
              <polygon points="8,5 8,19 19,12" />
            </svg>
          </div>
        </div>

        {/* Brand */}
        <h1
          className={`text-5xl font-black tracking-wider transition-all duration-500 ${
            phase === 'dark' || phase === 'glow'
              ? 'opacity-0 translate-y-4 scale-90'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <span className="text-gradient">DASH</span>
          <span className="text-white/50 text-3xl font-medium ml-2">Lifestyle</span>
        </h1>

        {/* Tagline */}
        <p
          className={`mt-3 text-sm text-text-secondary tracking-[0.2em] uppercase transition-all duration-500 ${
            phase === 'tagline' || phase === 'exit'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          Stream &bull; Play &bull; Live
        </p>

        {/* Powered by */}
        <p
          className={`mt-6 text-[10px] text-text-muted/40 transition-all duration-500 delay-200 ${
            phase === 'tagline' || phase === 'exit'
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          by DASH
        </p>
      </div>
    </div>
  );
};
