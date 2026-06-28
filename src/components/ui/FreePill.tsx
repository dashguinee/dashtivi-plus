import { memo } from 'react';

/**
 * FreePill — the "FREE" gift badge. Icey sky-blue + white light = our "free"
 * (the cloud-blue flair, matches the violet — NOT green).
 * Shared across every channel-tile surface so a FREE channel reads identically.
 * Present, not loud — a bright icy sheen. Premium gets none.
 */
export const FreePill = memo(function FreePill({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded-full px-1.5 py-[1px] text-[7.5px] font-bold leading-none tracking-[0.6px] ${className}`}
      style={{
        // Icey sky-blue: a light cloud-blue fill + a bright icy contour + a white-light sheen.
        color: 'rgba(245,251,255,0.95)',
        background: 'linear-gradient(180deg, rgba(156,208,255,0.80) 0%, rgba(96,165,250,0.80) 100%)',
        border: '0.7px solid rgba(191,226,255,0.92)',
        boxShadow: '0 0 7px rgba(120,190,255,0.45), 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      FREE
    </span>
  );
});

export default FreePill;
