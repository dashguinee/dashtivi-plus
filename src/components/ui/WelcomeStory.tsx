import React, { useState, useEffect, useRef } from 'react';

/**
 * WelcomeStory — Cinematic welcome in the hero space.
 *
 * Positioned in the TOP portion of the hero (not center — leaves room for DashTivi+ below).
 * "Welcome" appears on first click. Then experiences bloom. Then DASH.
 * Everything breathes. Nothing bounces. Art, not animation.
 */

const EXPERIENCES = [
  { text: 'Sports', glow: 'rgba(34,197,94,0.4)', x: '-28%', y: '-25%' },
  { text: 'Cinema', glow: 'rgba(239,68,68,0.4)', x: '22%', y: '-18%' },
  { text: 'Music', glow: 'rgba(168,85,247,0.4)', x: '-22%', y: '12%' },
  { text: 'Discovery', glow: 'rgba(20,184,166,0.4)', x: '26%', y: '18%' },
  { text: 'Stories', glow: 'rgba(59,130,246,0.4)', x: '0%', y: '-2%' },
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

    const t: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Glow appears
    t.push(setTimeout(() => setPhase(1), 100));
    // Phase 2: "Welcome"
    t.push(setTimeout(() => setPhase(2), 800));
    // Phase 3: Experiences bloom
    t.push(setTimeout(() => setPhase(3), 3500));
    EXPERIENCES.forEach((_, i) => {
      t.push(setTimeout(() => setActiveExp(i), 3800 + i * 900));
    });
    // Phase 4: DASH
    t.push(setTimeout(() => setPhase(4), 8500));
    // Phase 5: Dissolve
    t.push(setTimeout(() => setPhase(5), 10500));
    t.push(setTimeout(() => setVisible(false), 12500));

    return () => t.forEach(clearTimeout);
  }, [started]);

  if (!visible || !started) return null;

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 pointer-events-none"
      style={{
        height: '65%', // Top 65% of hero — never touches DashTivi+ section below
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase >= 5 ? 0 : 1,
        transition: 'opacity 2s ease-out',
      }}
    >
      {/* Central glow orb */}
      {phase >= 1 && (
        <div
          className="absolute"
          style={{
            width: phase >= 3 ? '350px' : phase >= 2 ? '200px' : '60px',
            height: phase >= 3 ? '350px' : phase >= 2 ? '200px' : '60px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${
              phase >= 3 && activeExp >= 0
                ? EXPERIENCES[Math.min(activeExp, EXPERIENCES.length - 1)].glow.replace('0.4', '0.08')
                : 'rgba(157,78,221,0.08)'
            } 0%, transparent 70%)`,
            transition: 'all 2.5s ease-out',
            animation: 'storyBreathe 5s ease-in-out infinite',
          }}
        />
      )}

      {/* "Welcome" — elegant, luminous, centered */}
      {phase >= 2 && phase < 4 && (
        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 100,
            letterSpacing: '0.5em',
            color: 'rgba(255,255,255,0)',
            textShadow: '0 0 80px rgba(157,78,221,0.25)',
            animation: 'welcomeFadeIn 2.5s ease-out forwards',
            position: 'absolute',
          }}
        >
          Welcome
        </h2>
      )}

      {/* Experience words — bloom around center, accumulate */}
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
                fontFamily: "'Inter', sans-serif",
                fontSize: i === EXPERIENCES.length - 1 ? 'clamp(1.2rem, 3vw, 1.8rem)' : 'clamp(0.9rem, 2.5vw, 1.3rem)',
                fontWeight: i === EXPERIENCES.length - 1 ? 300 : 100,
                letterSpacing: '0.3em',
                color: activeExp >= i ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0)',
                textShadow: activeExp >= i ? `0 0 40px ${exp.glow}` : 'none',
                transition: 'color 1.5s ease-out, text-shadow 2s ease-out',
              }}
            >
              {exp.text}
            </span>
          ))}
        </>
      )}

      {/* "DASH — Your Universe" */}
      {phase >= 4 && phase < 5 && (
        <div
          className="text-center absolute"
          style={{ animation: 'dashFadeIn 2s ease-out forwards' }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              letterSpacing: '0.6em',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: '1rem',
              fontWeight: 200,
              animation: 'storyBreathe 5s ease-in-out infinite',
            }}
          >
            YOUR UNIVERSE
          </p>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              fontWeight: 700,
              letterSpacing: '0.35em',
              background: 'linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 30%, #C77DFF 60%, #E0AAFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 50px rgba(157,78,221,0.25))',
              animation: 'storyBreathe 5s ease-in-out infinite',
            }}
          >
            DASH
          </h2>
        </div>
      )}

      <style>{`
        @keyframes storyBreathe {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes welcomeFadeIn {
          0% { color: rgba(255,255,255,0); letter-spacing: 0.8em; }
          100% { color: rgba(255,255,255,0.75); letter-spacing: 0.5em; }
        }
        @keyframes dashFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
