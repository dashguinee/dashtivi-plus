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
  <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-6">
      <div className="text-4xl font-bold text-gradient">DashTivi<span className="text-primary-light">+</span></div>
      <LoadingSpinner size="lg" text="Loading..." />
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
