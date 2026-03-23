import React, { useState, useEffect, useRef } from 'react';

/**
 * WelcomeStory — Cinematic welcome sequence in the hero space.
 *
 * Art direction: Dark, atmospheric, matches the Afro soul ambient at 0.8x.
 * Everything fades — nothing slides, nothing shakes, nothing bounces.
 * Typography breathes with subtle purple glow.
 * Triggered on first user click (same gesture as ambient audio).
 *
 * Timeline (~10s at ambient pace):
 *   0-2s:   Darkness. Glow point appears center, breathing.
 *   2-4s:   "Welcome" fades in — thin, tracked, luminous.
 *   4-8s:   Experience words cycle — each emerges and dissolves into the next.
 *   8-10s:  "DASH" gradient text, breathing. Then fade to hero.
 */

const EXPERIENCES = [
  { text: 'Sports', glow: 'rgba(34,197,94,0.15)', x: '-30%', y: '-20%' },
  { text: 'Cinema', glow: 'rgba(239,68,68,0.15)', x: '25%', y: '-15%' },
  { text: 'Music', glow: 'rgba(168,85,247,0.15)', x: '-25%', y: '15%' },
  { text: 'Discovery', glow: 'rgba(20,184,166,0.15)', x: '30%', y: '20%' },
  { text: 'Stories', glow: 'rgba(59,130,246,0.15)', x: '0%', y: '0%' },
];

interface Props {
  started?: boolean;
}

export const WelcomeStory: React.FC<Props> = ({ started = false }) => {
  const [phase, setPhase] = useState(0);
  const [activeExp, setActiveExp] = useState(-1);
  const [visible, setVisible] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!started || hasRun.current) return;
    hasRun.current = true;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Glow point
    timers.push(setTimeout(() => setPhase(1), 300));
    // Phase 2: "Welcome"
    timers.push(setTimeout(() => setPhase(2), 2000));
    // Phase 3: Experiences cycle
    timers.push(setTimeout(() => setPhase(3), 4000));
    // Cycle through experiences
    EXPERIENCES.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveExp(i), 4200 + i * 800));
    });
    // Phase 4: DASH
    timers.push(setTimeout(() => setPhase(4), 8200));
    // Phase 5: Fade out
    timers.push(setTimeout(() => setPhase(5), 10000));
    // Remove from DOM
    timers.push(setTimeout(() => setVisible(false), 11500));

    return () => timers.forEach(clearTimeout);
  }, [started]);

  if (!visible) return null;
  if (!started && phase === 0) {
    // Before first click — show nothing (hero content visible)
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      style={{
        opacity: phase >= 5 ? 0 : 1,
        transition: 'opacity 1.5s ease-out',
      }}
    >
      {/* Central glow point — appears first, breathes throughout */}
      {phase >= 1 && (
        <div
          className="absolute"
          style={{
            width: phase >= 2 ? '300px' : '80px',
            height: phase >= 2 ? '300px' : '80px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${
              phase >= 3 && activeExp >= 0
                ? EXPERIENCES[activeExp]?.glow || 'rgba(157,78,221,0.12)'
                : 'rgba(157,78,221,0.12)'
            } 0%, transparent 70%)`,
            transition: 'all 2s ease-out',
            animation: 'breatheGlow 4s ease-in-out infinite',
          }}
        />
      )}

      {/* "Welcome" — thin, wide-tracked, luminous */}
      {phase >= 2 && phase < 4 && (
        <h2
          style={{
            fontSize: '2.5rem',
            fontWeight: 200,
            letterSpacing: '0.4em',
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 0 60px rgba(157,78,221,0.3), 0 0 120px rgba(157,78,221,0.1)',
            opacity: phase >= 3 ? 0 : 1,
            transition: 'opacity 1.5s ease-out',
            animation: 'textBreathe 4s ease-in-out infinite',
          }}
        >
          Welcome
        </h2>
      )}

      {/* Experience words — scattered around center, fade in at different positions */}
      {phase >= 3 && phase < 4 && (
        <>
          {EXPERIENCES.map((exp, i) => (
            <span
              key={exp.text}
              className="absolute"
              style={{
                left: `calc(50% + ${exp.x})`,
                top: `calc(50% + ${exp.y})`,
                transform: 'translate(-50%, -50%)',
                fontSize: i === EXPERIENCES.length - 1 ? '2rem' : '1.4rem',
                fontWeight: i === EXPERIENCES.length - 1 ? 400 : 200,
                letterSpacing: '0.25em',
                color: `rgba(255,255,255,${activeExp >= i ? 0.7 : 0})`,
                textShadow: activeExp >= i ? `0 0 50px ${exp.glow.replace('0.15', '0.5')}` : 'none',
                transition: 'all 1.2s ease-out',
              }}
            >
              {exp.text}
            </span>
          ))}
        </>
      )}

      {/* "DASH" — gradient, breathing, final reveal */}
      {phase >= 4 && phase < 5 && (
        <div className="text-center" style={{ animation: 'dashReveal 1.5s ease-out forwards' }}>
          <p
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.5em',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '0.75rem',
              fontWeight: 300,
              animation: 'textBreathe 4s ease-in-out infinite',
            }}
          >
            YOUR UNIVERSE
          </p>
          <h2
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              letterSpacing: '0.3em',
              background: 'linear-gradient(135deg, #9D4EDD, #C77DFF, #E0AAFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(157,78,221,0.3))',
              animation: 'textBreathe 4s ease-in-out infinite',
            }}
          >
            DASH
          </h2>
        </div>
      )}

      <style>{`
        @keyframes breatheGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes textBreathe {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes dashReveal {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
