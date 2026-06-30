import React, { useState, useEffect } from 'react';
import { Home, Tv, Film, BookOpen, Users } from 'lucide-react';

interface VeeWheelProps {
  active: boolean;
  currentPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  /** Center anchor — where the V pebble lives (px from viewport top-left) */
  centerX: number;
  centerY: number;
}

// Tivi+ districts — arcing ABOVE the V pebble (bottom nav, semicircle upward)
const DISTRICTS = [
  { path: '/movies',  icon: Film,    label: 'Films',   angle: -145 },
  { path: '/live',    icon: Tv,      label: 'Live',    angle: -108 },
  { path: '/',        icon: Home,    label: 'Home',    angle: -72  },
  { path: '/series',  icon: BookOpen,label: 'Séries',  angle: -35  },
  { path: '/hub',     icon: Users,   label: 'DaHub',   angle: 2    },
];

const RADIUS = 100;

// 0.23 heartbeat — the DASH easing
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

export const VeeWheel: React.FC<VeeWheelProps> = ({
  active, currentPath, onSelect, onClose, centerX, centerY,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!active) { setMounted(false); return; }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;

  return (
    <>
      {/* Frosted backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(5, 3, 15, 0.65)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          opacity: mounted ? 1 : 0,
          transition: `opacity 0.28s ${EASE}`,
        }}
      />

      {/* District orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 310, pointerEvents: 'none' }}>
        {DISTRICTS.map((d, i) => {
          const rad = (d.angle * Math.PI) / 180;
          const tx = centerX + Math.cos(rad) * RADIUS;
          const ty = centerY + Math.sin(rad) * RADIUS;
          const isActive = d.path === '/'
            ? currentPath === '/'
            : currentPath.startsWith(d.path);
          const isHome = d.path === '/';
          const Icon = d.icon;

          return (
            <React.Fragment key={d.path}>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(d.path); }}
                style={{
                  position: 'fixed',
                  left: mounted ? tx - 28 : centerX - 28,
                  top: mounted ? ty - 28 : centerY - 28,
                  width: 56, height: 56,
                  borderRadius: '50%',
                  background: isHome
                    ? 'radial-gradient(circle at 35% 30%, #FF8AD0, #A855F7 52%, #3B82F6)'
                    : isActive
                      ? 'rgba(168, 85, 247, 0.20)'
                      : 'rgba(255, 255, 255, 0.07)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1.5px solid ${
                    isHome    ? 'rgba(168,85,247,0.50)'
                    : isActive ? 'rgba(168,85,247,0.35)'
                    : 'rgba(255,255,255,0.10)'
                  }`,
                  boxShadow: isHome
                    ? '0 0 24px rgba(168,85,247,0.45), 0 4px 20px rgba(0,0,0,0.4)'
                    : isActive
                      ? '0 0 16px rgba(168,85,247,0.25), 0 4px 16px rgba(0,0,0,0.3)'
                      : '0 4px 16px rgba(0,0,0,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', pointerEvents: 'auto',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'scale(1)' : 'scale(0)',
                  transition: `left 0.42s ${EASE} ${i * 0.045}s, top 0.42s ${EASE} ${i * 0.045}s, opacity 0.35s ${EASE} ${i * 0.035}s, transform 0.42s ${EASE} ${i * 0.045}s`,
                }}
              >
                <Icon
                  size={isHome ? 20 : 18}
                  color={isHome ? 'rgba(255,255,255,0.95)' : isActive ? '#C77DFF' : 'rgba(255,255,255,0.55)'}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
              </button>

              {/* Label */}
              <span
                style={{
                  position: 'fixed',
                  left: centerX + Math.cos(rad) * (RADIUS + 38),
                  top: centerY + Math.sin(rad) * (RADIUS + 38),
                  transform: 'translate(-50%, -50%)',
                  fontSize: 10, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#C77DFF' : 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.06em',
                  pointerEvents: 'none',
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.35s ${EASE} ${0.12 + i * 0.03}s`,
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                }}
              >
                {d.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};
