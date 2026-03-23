import React, { useState, useEffect, useRef } from 'react';

/**
 * WelcomeStory — Cinematic welcome in the hero space.
 *
 * Top portion of hero. "Welcome" on load → experiences bloom with shimmer →
 * DASH → collapses hero to bring DashTivi+ up.
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
  onComplete?: () => void; // Called when story finishes — parent collapses hero
}

export const WelcomeStory: React.FC<Props> = ({ started = false, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [activeExp, setActiveExp] = useState(-1);
  const [visible, setVisible] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const t: ReturnType<typeof setTimeout>[] = [];

    t.push(setTimeout(() => setPhase(1), 100));
    t.push(setTimeout(() => setPhase(2), 800));
    t.push(setTimeout(() => setPhase(3), 3500));
    EXPERIENCES.forEach((_, i) => {
      t.push(setTimeout(() => setActiveExp(i), 3800 + i * 900));
    });
    t.push(setTimeout(() => setPhase(4), 8500));
    t.push(setTimeout(() => setPhase(5), 10500));
    t.push(setTimeout(() => { setVisible(false); onComplete?.(); }, 12000));

    return () => t.forEach(clearTimeout);
  }, [started, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 pointer-events-none"
      style={{
        height: '65%',
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

      {/* "Welcome" */}
      {phase >= 2 && phase < 4 && (
        <h2
          className="absolute"
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 100,
            letterSpacing: '0.5em',
            color: 'rgba(255,255,255,0)',
            textShadow: '0 0 80px rgba(157,78,221,0.25)',
            animation: 'welcomeFadeIn 2.5s ease-out forwards',
          }}
        >
          Welcome
        </h2>
      )}

      {/* Purple shimmer sweep */}
      {phase >= 2 && phase < 5 && (
        <div
          className="absolute"
          style={{
            width: '70%',
            height: '1px',
            top: '48%',
            left: '15%',
            background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.2), rgba(199,125,255,0.5), rgba(157,78,221,0.2), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 4s ease-in-out infinite',
          }}
        />
      )}
      {/* Orange shimmer sweep — offset timing */}
      {phase >= 3 && phase < 5 && (
        <div
          className="absolute"
          style={{
            width: '55%',
            height: '1px',
            top: '52%',
            left: '22%',
            background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.15), rgba(249,115,22,0.4), rgba(251,146,60,0.15), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 4s ease-in-out 1.5s infinite',
          }}
        />
      )}

      {/* Experience words */}
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
        @keyframes shimmerSweep {
          0% { background-position: -200% 0; opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { background-position: 200% 0; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
