import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ size = 'md', text }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-bg-elevated" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      {text && <p className="text-sm text-text-secondary animate-pulse">{text}</p>}
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
      <div className="mt-4 mx-auto w-8 h-[2px] rounded-full overflow-hidden bg-white/5">
        <div className="h-full w-full bg-primary/60 rounded-full" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
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
