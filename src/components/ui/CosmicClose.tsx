import React from 'react';

interface CosmicCloseProps {
  onClick: () => void;
  size?: 'sm' | 'md';
}

export function CosmicClose({ onClick, size = 'md' }: CosmicCloseProps) {
  const dim = size === 'sm' ? 32 : 38;
  const iconSize = size === 'sm' ? 11 : 14;

  return (
    <button
      onClick={onClick}
      className="group relative flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        width: dim,
        height: dim,
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ border: '1px solid rgba(157,78,221,0.2)', boxShadow: '0 0 12px rgba(157,78,221,0.06)' }}
      />
      <svg width={iconSize} height={iconSize} viewBox="0 0 14 14" fill="none" className="relative z-10">
        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="group-hover:[stroke:rgba(157,78,221,0.7)] transition-all duration-200"
        />
      </svg>
    </button>
  );
}
