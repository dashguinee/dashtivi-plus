import React, { useRef, useEffect } from 'react';

/**
 * AuroraHero — lightweight GPU-composited ambient effect.
 * Soft moving light beams with subtle shimmer. Pure CSS animations,
 * no canvas, no JS per-frame. Uses will-change + transform only.
 */

interface Props {
  gradient: string; // tailwind gradient classes
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
}

const PALETTE = {
  morning: {
    beam1: 'rgba(59, 130, 246, 0.08)',   // blue
    beam2: 'rgba(147, 197, 253, 0.06)',   // light blue
    beam3: 'rgba(99, 102, 241, 0.05)',    // indigo
    orb: 'rgba(56, 189, 248, 0.04)',      // cyan
  },
  afternoon: {
    beam1: 'rgba(245, 158, 11, 0.08)',    // amber
    beam2: 'rgba(251, 191, 36, 0.06)',    // yellow
    beam3: 'rgba(239, 68, 68, 0.04)',     // red hint
    orb: 'rgba(252, 211, 77, 0.04)',      // gold
  },
  evening: {
    beam1: 'rgba(157, 78, 221, 0.1)',     // brand purple
    beam2: 'rgba(201, 240, 60, 0.05)',    // brand lime
    beam3: 'rgba(124, 58, 237, 0.06)',    // violet
    orb: 'rgba(157, 78, 221, 0.04)',      // purple
  },
  night: {
    beam1: 'rgba(99, 102, 241, 0.08)',    // indigo
    beam2: 'rgba(139, 92, 246, 0.06)',    // violet
    beam3: 'rgba(67, 56, 202, 0.05)',     // deep indigo
    orb: 'rgba(99, 102, 241, 0.03)',      // indigo faint
  },
};

export const AuroraHero: React.FC<Props> = React.memo(({ gradient, timeSlot }) => {
  const colors = PALETTE[timeSlot] || PALETTE.evening;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ contain: 'strict' }}>
      {/* Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ opacity: 0.5 }} />

      {/* Beam 1 — slow diagonal sweep */}
      <div
        className="absolute aurora-beam-1"
        style={{
          width: '200%',
          height: '120%',
          top: '-20%',
          left: '-50%',
          background: `linear-gradient(135deg, transparent 30%, ${colors.beam1} 45%, transparent 60%)`,
          willChange: 'transform',
        }}
      />

      {/* Beam 2 — counter-sweep, slightly faster */}
      <div
        className="absolute aurora-beam-2"
        style={{
          width: '180%',
          height: '150%',
          top: '-30%',
          left: '-40%',
          background: `linear-gradient(225deg, transparent 35%, ${colors.beam2} 50%, transparent 65%)`,
          willChange: 'transform',
        }}
      />

      {/* Beam 3 — vertical drift */}
      <div
        className="absolute aurora-beam-3"
        style={{
          width: '150%',
          height: '200%',
          top: '-60%',
          left: '-25%',
          background: `radial-gradient(ellipse at 50% 50%, ${colors.beam3} 0%, transparent 60%)`,
          willChange: 'transform',
        }}
      />

      {/* Soft orb — breathing pulse */}
      <div
        className="absolute aurora-orb"
        style={{
          width: '60%',
          height: '80%',
          top: '10%',
          right: '-10%',
          background: `radial-gradient(circle at center, ${colors.orb} 0%, transparent 70%)`,
          willChange: 'transform, opacity',
        }}
      />

      {/* Shimmer line — subtle horizon glow */}
      <div
        className="absolute bottom-0 left-0 right-0 aurora-shimmer"
        style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${colors.beam1}, transparent)`,
          opacity: 0.4,
        }}
      />
    </div>
  );
});

AuroraHero.displayName = 'AuroraHero';
