import React from 'react';
import { tap } from '@/lib/haptics';
import type { League } from '@/services/sports-data';

interface Props {
  leagues: League[];
  activeId: string;
  onSelect: (id: string) => void;
}

const LeagueSelector: React.FC<Props> = ({ leagues, activeId, onSelect }) => (
  <div
    className="flex gap-2 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-2"
    data-haptic="lush"
  >
    {leagues.map((league) => {
      const isActive = league.id === activeId;
      return (
        <button
          key={league.id}
          className={[
            'flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors',
            isActive
              ? 'bg-orange-500/15 border border-orange-500/40 text-orange-400'
              : 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/70',
          ].join(' ')}
          onPointerDown={() => tap()}
          onClick={() => onSelect(league.id)}
        >
          {league.shortName}
        </button>
      );
    })}
  </div>
);

export default React.memo(LeagueSelector);
