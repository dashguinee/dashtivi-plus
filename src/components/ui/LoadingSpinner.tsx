import React from 'react';

export function LoadingSpinner({ text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-14 h-14">
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute inset-0 rounded-full"
            style={{
              border: '1.5px solid rgba(157,78,221,0.25)',
              animation: `signal-pulse 1.8s ease-in-out ${i * 0.4}s infinite`,
              transform: `scale(${1 + i * 0.35})`,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#9D4EDD', boxShadow: '0 0 12px rgba(157,78,221,0.6)' }} />
        </div>
      </div>
      {text && (
        <span className="text-[11px] font-mono tracking-[0.2em] uppercase" style={{ color: 'rgba(157,78,221,0.45)' }}>
          {text}
        </span>
      )}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a12]/90 z-50">
      <LoadingSpinner text="Tuning signal" />
    </div>
  );
}

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-xl ${className}`} />
);

export function SkeletonRow() {
  return (
    <div className="px-4 py-3">
      <div className="h-4 w-28 rounded-lg mb-3" style={{ background: 'rgba(157,78,221,0.08)' }} />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 130, border: '1px solid rgba(157,78,221,0.06)' }}>
            <div className="aspect-video relative overflow-hidden" style={{ background: 'rgba(157,78,221,0.04)' }}>
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(157,78,221,0.08) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: `cosmic-sweep 2.4s ease-in-out ${i * 0.15}s infinite`,
              }} />
            </div>
            <div className="p-2.5 space-y-1.5">
              <div className="h-2.5 rounded-full w-3/4" style={{ background: 'rgba(157,78,221,0.08)' }} />
              <div className="h-2 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
