import React from 'react';
import { Crown, ArrowRight, UserPlus } from 'lucide-react';

interface WatchGateProps {
  canDismiss: boolean;
  onDismiss?: () => void;
  onCreateAccount: () => void;
  onSubscribe: () => void;
}

const serviceBadges = [
  { name: 'Netflix', color: '#E50914', letter: 'N' },
  { name: 'Prime', color: '#00A8E1', letter: '▶' },
  { name: 'Disney+', color: '#113CCF', letter: 'D+' },
  { name: 'Spotify', color: '#1DB954', letter: 'S' },
];

export const WatchGate: React.FC<WatchGateProps> = ({
  canDismiss,
  onDismiss,
  onCreateAccount,
  onSubscribe,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/10 animate-scale-in"
        style={{ background: 'linear-gradient(135deg, rgba(30,30,40,0.98), rgba(15,15,25,0.98))' }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 bg-purple-500" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-3xl opacity-15 bg-emerald-500" />

        <div className="relative z-10 p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-primary-light">
              <polygon points="8,5 8,19 19,12" />
            </svg>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            You're Loving DASH Lifestyle
          </h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            Create a free account to keep watching unlimited channels
          </p>

          {/* Service logos row */}
          <div className="flex items-center justify-center gap-2.5 mb-2">
            {serviceBadges.map((s) => (
              <div
                key={s.name}
                className="w-9 h-9 rounded-full flex items-center justify-center opacity-60"
                style={{ backgroundColor: s.color }}
              >
                <span className="text-xs font-black text-white">{s.letter}</span>
              </div>
            ))}
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white/50">+3</span>
            </div>
          </div>
          <p className="text-[11px] text-white/40 mb-6">
            Plus unlock Netflix, Prime, Disney+ & more
          </p>

          {/* Primary CTA */}
          <button
            onClick={onCreateAccount}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] mb-3"
            style={{ background: 'linear-gradient(135deg, #10B981, #14B8A6)' }}
          >
            <UserPlus className="w-4.5 h-4.5" />
            Create Free Account
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onSubscribe}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/10"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
          >
            <Crown className="w-4 h-4" />
            Subscribe to DASH Lifestyle
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Dismiss */}
          {canDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-4 text-xs text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
