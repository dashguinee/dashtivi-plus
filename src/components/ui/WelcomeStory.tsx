import React, { useState, useEffect } from 'react';

/**
 * WelcomeStory — Animated storytelling in the hero banner space.
 *
 * A micro-cinema that tells the DASH story in 8 seconds:
 * "Welcome" → experiences flash → "Your Universe"
 *
 * Pure CSS animations, no external dependencies.
 */

const EXPERIENCES = [
  { text: 'Sports', emoji: '⚽', color: 'text-green-400' },
  { text: 'Cinema', emoji: '🎬', color: 'text-red-400' },
  { text: 'Kids', emoji: '🧸', color: 'text-pink-400' },
  { text: 'Music', emoji: '🎵', color: 'text-fuchsia-400' },
  { text: 'News', emoji: '📰', color: 'text-blue-400' },
  { text: 'Discovery', emoji: '🌍', color: 'text-teal-400' },
];

export const WelcomeStory: React.FC = () => {
  const [phase, setPhase] = useState(0);
  // Phase 0: nothing (200ms)
  // Phase 1: "Welcome" slides in + shakes (0-1.5s)
  // Phase 2: experiences flash one by one (1.5-5s)
  // Phase 3: "Your Universe" + DASH (5-7s)
  // Phase 4: fade out (7-8s)

  const [activeExp, setActiveExp] = useState(-1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 5500),
      setTimeout(() => setPhase(4), 7500),
    ];

    // Flash experiences one by one during phase 2
    EXPERIENCES.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveExp(i), 2000 + i * 550));
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${phase >= 4 ? 'opacity-0' : 'opacity-100'}`}>
      {/* Phase 1: Welcome */}
      {phase >= 1 && phase < 3 && (
        <div
          className="text-center animate-fade-in"
          style={{
            animation: phase === 1 ? 'welcomeSlideIn 0.8s ease-out forwards' : undefined,
          }}
        >
          <h2
            className="text-4xl sm:text-5xl font-black text-white tracking-wide"
            style={{
              animation: 'welcomeShake 0.5s ease-in-out 1s 1',
              textShadow: '0 0 40px rgba(157,78,221,0.5)',
            }}
          >
            Welcome
          </h2>

          {/* Phase 2: Experiences flashing */}
          {phase >= 2 && (
            <div className="mt-6 h-12 flex items-center justify-center">
              {EXPERIENCES.map((exp, i) => (
                <span
                  key={exp.text}
                  className={`absolute text-2xl font-bold transition-all duration-300 ${exp.color} ${
                    activeExp === i ? 'opacity-100 scale-110' : 'opacity-0 scale-75'
                  }`}
                  style={{
                    animation: activeExp === i ? 'expPop 0.5s ease-out' : undefined,
                  }}
                >
                  <span className="mr-2 inline-block" style={{
                    animation: activeExp === i ? 'emojiShake 0.4s ease-in-out 0.1s 1' : undefined,
                  }}>
                    {exp.emoji}
                  </span>
                  {exp.text}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Your Universe */}
      {phase >= 3 && phase < 4 && (
        <div className="text-center animate-scale-in">
          <p className="text-sm text-white/40 tracking-[4px] uppercase mb-2 animate-fade-in">
            Your Universe
          </p>
          <h2
            className="text-5xl sm:text-6xl font-black tracking-[8px] animate-fade-in-up"
            style={{
              background: 'linear-gradient(135deg, #9D4EDD, #C77DFF, #E0AAFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(157,78,221,0.4))',
            }}
          >
            DASH
          </h2>
        </div>
      )}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes welcomeSlideIn {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes welcomeShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-1deg); }
          40% { transform: translateX(4px) rotate(1deg); }
          60% { transform: translateX(-3px) rotate(-0.5deg); }
          80% { transform: translateX(2px) rotate(0.5deg); }
        }
        @keyframes expPop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes emojiShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
};
