/**
 * AfricaSpark — Tivi+ port of VOYO's AfricaIcon, retuned to the Gira feel.
 *
 * Concept kept from the source (voyo-music/src/components/ui/AfricaIcon.tsx):
 *   · spinning orbital rings (a globe)
 *   · a fixed African continent that gently BOUNCES
 *   · vertical EQ-style beams pulsing inside the continent
 *
 * Adapted for Tivi+:
 *   · Palette swapped from VOYO purple → African-celebratory green #007749
 *     + gold #FFB612 (StationHero's accent pair), so it reads as Oyé cheer,
 *     not VOYO chrome.
 *   · The bounce rides the DASH signature ease cubic-bezier(0.23,1,0.32,1)
 *     so it feels like the rest of Tivi+ — one organic heartbeat.
 *
 * Pure SVG + CSS, no deps. Honours prefers-reduced-motion.
 */

interface AfricaSparkProps {
  size?: number;
  className?: string;
  /** Orbital rotation period in seconds (default 8s). */
  orbitSpeed?: number;
  /** Pause all motion (e.g. when the card is off-screen). */
  paused?: boolean;
}

const GREEN = '#007749';
const GOLD = '#FFB612';

export const AfricaSpark = ({
  size = 64,
  className = '',
  orbitSpeed = 8,
  paused = false,
}: AfricaSparkProps) => {
  const playState = paused ? 'paused' : 'running';
  const AFRICA_PATH =
    'M 30,16 C 34,14 38,13 44,13 C 50,13 56,13 62,14 C 66,14 70,15 72,18 ' +
    'C 73,22 72,26 73,30 C 74,32 76,33 78,34 C 80,36 82,39 80,42 ' +
    'C 78,44 75,43 72,44 C 70,45 68,48 67,52 C 66,56 65,60 64,64 ' +
    'C 62,68 60,72 57,76 C 54,80 51,83 48,85 C 46,86 44,85 43,82 ' +
    'C 42,78 43,74 42,70 C 40,66 37,63 35,59 C 33,55 31,51 30,47 ' +
    'C 29,44 27,42 26,40 C 24,37 23,34 25,32 C 27,30 29,30 31,29 ' +
    'C 32,26 30,23 28,21 C 26,19 26,17 30,16 Z';

  return (
    <div
      role="img"
      aria-label="Oyé Africa globe"
      className={`africa-spark relative inline-block ${className}`}
      style={{ width: size, height: size, ['--spark-play' as string]: playState }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="spark-gold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD46B" />
            <stop offset="52%" stopColor={GOLD} />
            <stop offset="100%" stopColor="#C98A14" />
          </linearGradient>
          <linearGradient id="spark-ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.1" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.65" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0.1" />
          </linearGradient>
          <clipPath id="spark-clip">
            <path d={AFRICA_PATH} />
          </clipPath>
          <radialGradient id="spark-inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.42" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Inner glow — breathes with the bounce */}
        <circle cx="50" cy="50" r="45" fill="url(#spark-inner-glow)" className="spark-glow" />

        {/* Orbital rings — green globe lines spinning at three speeds */}
        <g className="spark-ring-1">
          <ellipse cx="50" cy="50" rx="44" ry="12" stroke="url(#spark-ring)" strokeWidth="1.2" fill="none" opacity="0.7" />
        </g>
        <g className="spark-ring-2">
          <ellipse cx="50" cy="50" rx="44" ry="18" stroke="url(#spark-ring)" strokeWidth="1" fill="none" opacity="0.5" transform="rotate(-30 50 50)" />
        </g>
        <g className="spark-ring-3">
          <ellipse cx="50" cy="50" rx="46" ry="8" stroke={GREEN} strokeWidth="0.6" fill="none" opacity="0.35" transform="rotate(60 50 50)" />
        </g>

        {/* Continent — fixed, gentle celebratory bounce */}
        <g className="spark-continent">
          <path d={AFRICA_PATH} fill="#000" opacity="0.4" transform="translate(1 1.5)" />
          <path d={AFRICA_PATH} fill="url(#spark-gold)" stroke="#FFD46B" strokeWidth="0.8" strokeLinejoin="round" />
          <g clipPath="url(#spark-clip)">
            <rect className="spark-beam-1" x="34" y="12" width="3" height="78" rx="1.5" fill="#FFF1CC" opacity="0.55" />
            <rect className="spark-beam-2" x="42" y="12" width="3" height="78" rx="1.5" fill="#FFF1CC" opacity="0.65" />
            <rect className="spark-beam-3" x="50" y="12" width="3" height="78" rx="1.5" fill="#FFF1CC" opacity="0.6" />
            <rect className="spark-beam-4" x="58" y="12" width="3" height="78" rx="1.5" fill="#FFF1CC" opacity="0.5" />
          </g>
          <path d="M 34,16 C 42,13 52,13 62,14" stroke="#FFF1CC" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" fill="none" />
        </g>
      </svg>

      <style>{`
        .africa-spark { filter: drop-shadow(0 0 12px rgba(255, 182, 18, 0.28)); }

        .spark-ring-1 { transform-origin: 50% 50%; animation: spark-spin ${orbitSpeed}s linear infinite; animation-play-state: var(--spark-play); }
        .spark-ring-2 { transform-origin: 50% 50%; animation: spark-spin-rev ${orbitSpeed * 1.6}s linear infinite; animation-play-state: var(--spark-play); }
        .spark-ring-3 { transform-origin: 50% 50%; animation: spark-spin ${orbitSpeed * 0.6}s linear infinite; animation-play-state: var(--spark-play); }

        @keyframes spark-spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spark-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

        /* The cheer: continent bounces on the DASH signature ease — alive, not noisy */
        .spark-continent {
          transform-origin: 50% 80%;
          animation: spark-cheer 2.2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
          animation-play-state: var(--spark-play);
        }
        @keyframes spark-cheer {
          0%, 100% { transform: translateY(0) scale(1); }
          42%      { transform: translateY(-3px) scale(1.06); }
          60%      { transform: translateY(0.5px) scale(0.99); }
        }

        .spark-glow {
          transform-origin: 50% 50%;
          animation: spark-glow-pulse 2.2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
          animation-play-state: var(--spark-play);
        }
        @keyframes spark-glow-pulse {
          0%, 100% { opacity: 0.42; transform: scale(1); }
          42%      { opacity: 0.85; transform: scale(1.12); }
        }

        .spark-beam-1 { animation: spark-beam-1 1.1s ease-in-out infinite; transform-origin: 50% 100%; animation-play-state: var(--spark-play); }
        .spark-beam-2 { animation: spark-beam-2 0.9s ease-in-out infinite; transform-origin: 50% 100%; animation-play-state: var(--spark-play); }
        .spark-beam-3 { animation: spark-beam-3 1.3s ease-in-out infinite; transform-origin: 50% 100%; animation-play-state: var(--spark-play); }
        .spark-beam-4 { animation: spark-beam-4 1.0s ease-in-out infinite; transform-origin: 50% 100%; animation-play-state: var(--spark-play); }

        @keyframes spark-beam-1 { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(0.95); opacity: 0.7; } }
        @keyframes spark-beam-2 { 0%,100% { transform: scaleY(0.9); opacity: 0.8; } 50% { transform: scaleY(0.4); opacity: 0.5; } }
        @keyframes spark-beam-3 { 0%,100% { transform: scaleY(0.5); opacity: 0.55; } 50% { transform: scaleY(1); opacity: 0.8; } }
        @keyframes spark-beam-4 { 0%,100% { transform: scaleY(0.7); opacity: 0.4; } 50% { transform: scaleY(0.3); opacity: 0.6; } }

        @media (prefers-reduced-motion: reduce) {
          .spark-ring-1, .spark-ring-2, .spark-ring-3,
          .spark-continent, .spark-glow,
          .spark-beam-1, .spark-beam-2, .spark-beam-3, .spark-beam-4 { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default AfricaSpark;
