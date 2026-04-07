import React from 'react';
import { Search, Heart, Clock, Tv, Film } from 'lucide-react';

interface EmptyStateProps {
  icon: 'search' | 'heart' | 'history' | 'tv' | 'film';
  title: string;
  subtitle?: string;
}

const ICON_MAP = {
  search: Search,
  heart: Heart,
  history: Clock,
  tv: Tv,
  film: Film,
} as const;

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  const IconComponent = ICON_MAP[icon];

  return (
    <>
      <style>{`
        @keyframes empty-state-breathe {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }
        .empty-state-icon {
          animation: empty-state-breathe 3s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .empty-state-icon { animation: none; opacity: 0.15; }
        }
      `}</style>
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <IconComponent className="w-10 h-10 text-white/10 empty-state-icon" />
          <p className="text-white/30 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-white/15 text-xs">{subtitle}</p>}
        </div>
      </div>
    </>
  );
};
