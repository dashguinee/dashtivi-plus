import { memo } from 'react';

/**
 * FreePill — the "FREE" gift badge. Green = psychologically "free".
 * Shared across every channel-tile surface so a FREE channel reads identically.
 * Softened: muted emerald, gentle glow — present, not loud. Premium gets none.
 */
export const FreePill = memo(function FreePill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full px-1.5 py-[1px] text-[7.5px] font-bold leading-none tracking-[0.6px] ${className}`}
      style={{
        // Two shades: balanced fill (faded a bit) + a neon-green CONTOUR — between soft + neon.
        color: 'rgba(214,250,228,0.85)',
        background: 'linear-gradient(180deg, rgba(52,160,98,0.70) 0%, rgba(34,120,74,0.70) 100%)',
        border: '0.7px solid rgba(74,222,128,0.85)',
        boxShadow: '0 0 6px rgba(74,222,128,0.35), 0 1px 3px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
      }}
    >
      FREE
    </span>
  );
});

export default FreePill;
