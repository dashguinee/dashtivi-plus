import { memo } from 'react';

/**
 * FreePill — the neon-green "FREE" gift badge.
 *
 * Shared across every channel-tile surface (home rows, collection/experience
 * grids, live-TV strip) so a FREE channel reads identically everywhere.
 * Bright green (#22C55E) with a neon glow = the free-gift identity.
 * Premium channels render NO pill — the absence is the signal.
 */
export const FreePill = memo(function FreePill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full px-1.5 py-[1px] text-[7.5px] font-black leading-none tracking-[0.7px] text-black ${className}`}
      style={{
        background: 'linear-gradient(180deg, #4ADE80 0%, #22C55E 100%)',
        border: '0.5px solid rgba(190,242,100,0.75)',
        boxShadow:
          '0 0 6px rgba(34,197,94,0.9), 0 0 12px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      FREE
    </span>
  );
});

export default FreePill;
