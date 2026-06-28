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
        color: '#DCFCE7',
        background: 'linear-gradient(180deg, rgba(52,160,98,0.92) 0%, rgba(34,120,74,0.92) 100%)',
        border: '0.5px solid rgba(110,200,150,0.45)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      FREE
    </span>
  );
});

export default FreePill;
