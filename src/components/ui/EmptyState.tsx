import React from 'react';

const VARIANTS: Record<string, { title: string; subtitle: string }> = {
  search: { title: 'No signal on that frequency', subtitle: 'Try different keywords or browse our experiences' },
  tv: { title: 'No signal on that frequency', subtitle: 'Try a different search or filter' },
  film: { title: 'No titles in this sector', subtitle: 'Try different keywords or browse genres' },
  browse: { title: 'This sector is uncharted', subtitle: 'New content arrives regularly' },
  offline: { title: 'Signal interrupted', subtitle: 'Check your connection and try again' },
};

interface EmptyStateProps {
  icon?: string;
  title?: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'search', title, subtitle }: EmptyStateProps) {
  const variant = VARIANTS[icon] || VARIANTS.search;
  const displayTitle = title || variant.title;
  const displaySubtitle = subtitle || variant.subtitle;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(157,78,221,0.4), transparent 70%)' }}
        />
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="relative">
          <circle cx="20" cy="20" r="16" stroke="rgba(157,78,221,0.15)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="20" cy="20" r="9" stroke="rgba(157,78,221,0.25)" strokeWidth="1" />
          <circle cx="20" cy="20" r="3" fill="rgba(157,78,221,0.15)" stroke="rgba(157,78,221,0.3)" strokeWidth="1" />
        </svg>
      </div>
      <p className="text-[13px] font-medium tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {displayTitle}
      </p>
      <p className="text-[11px] max-w-[240px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
        {displaySubtitle}
      </p>
    </div>
  );
}
