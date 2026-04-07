/**
 * NeonGate — A subtle "portal edge" at the end of horizontal scroll rows.
 * Hints that there's more content. On click, navigates to the full page.
 *
 * Design: vertical neon glow line with breathing animation + chevron icon.
 * Brand color: #c9f03c (lime green).
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NeonGateProps {
  /** Route to navigate to on click (e.g., '/movies', '/live') */
  navigateTo?: string;
  /** Optional click handler (overrides navigateTo) */
  onClick?: () => void;
  /** Height class — defaults to full height of parent */
  className?: string;
}

export const NeonGate: React.FC<NeonGateProps> = ({ navigateTo, onClick, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex-shrink-0 flex items-center justify-center cursor-pointer group/gate transition-opacity duration-300 hover:opacity-100 ${className}`}
      style={{
        width: 48,
        minHeight: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(201,240,60,0.08) 40%, rgba(201,240,60,0.15) 50%, rgba(201,240,60,0.08) 60%, transparent)',
        animation: 'neon-gate-breathe 4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
      }}
      aria-label="See more"
    >
      <ChevronRight
        className="w-4 h-4 text-white/20 group-hover/gate:text-white/40 transition-colors duration-300"
      />
    </button>
  );
};

/**
 * RowCountBadge — Subtle count badge for row headers (e.g., "24 channels").
 */
export const RowCountBadge: React.FC<{ count: number; label: string }> = ({ count, label }) => {
  if (count <= 0) return null;
  return (
    <span className="text-[10px] text-white/20 font-medium ml-1.5 tabular-nums">
      {count} {label}
    </span>
  );
};

/**
 * getCardScale — Returns a scale factor for cards based on their index.
 * First 2 cards: 1.0, cards 3-5: 0.95, cards 6+: 0.9
 */
export function getCardScale(index: number): number {
  if (index < 2) return 1.0;
  if (index < 5) return 0.95;
  return 0.9;
}

/**
 * cardScaleStyle — Returns inline style for card scale hierarchy.
 */
export function cardScaleStyle(index: number): React.CSSProperties {
  const scale = getCardScale(index);
  if (scale === 1.0) return {};
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'bottom left',
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  };
}
