import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * DASH Premium Loader — neon beam sweep instead of boring spinner.
 * A thin light beam scans horizontally, contained to its section.
 */
export const LoadingSpinner: React.FC<Props> = ({ size = 'md', text }) => {
  const widths = { sm: 'w-12', md: 'w-20', lg: 'w-28' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${widths[size]} h-[2px] rounded-full overflow-hidden`} style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.6), rgba(199,125,255,0.8), rgba(157,78,221,0.6), transparent)',
            animation: 'dash-beam 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
      </div>
      {text && <p className="text-[11px] text-white/25 font-light tracking-wide">{text}</p>}
    </div>
  );
};

export const FullPageLoader: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: '#060609' }}>
    <div className="text-center">
      <h1>
        <span className="text-[28px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
        <span className="text-[20px] font-light tracking-wide text-white/40" style={{ fontFamily: "'Outfit', sans-serif", marginLeft: '1px' }}>tivi</span>
        <span className="text-primary-light text-[14px] font-bold ml-0.5">+</span>
      </h1>
      <div className="mt-4 mx-auto w-10 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.6), rgba(199,125,255,0.8), rgba(157,78,221,0.6), transparent)',
            animation: 'dash-beam 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          }}
        />
      </div>
    </div>
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-xl ${className}`} />
);

export const SkeletonRow: React.FC = () => (
  <div className="space-y-3 px-4">
    <div className="skeleton h-6 w-40 rounded" />
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} className="w-40 h-24 flex-shrink-0" />
      ))}
    </div>
  </div>
);
