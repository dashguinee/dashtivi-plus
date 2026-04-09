/**
 * SportsArena — The Digital Stadium
 *
 * Self-contained sports section: league selector + match day cards + standings.
 * Lazy-loaded only when experience === 'sports'.
 * Manages its own data via useSportsData hook.
 */
import React from 'react';
import LeagueSelector from './LeagueSelector';
import MatchDayCards from './MatchDayCards';
import { StandingsWidget } from './StandingsWidget';
import { SportsNews } from './SportsNews';
import { useSportsData } from '@/hooks/useSportsData';

export const SportsArena: React.FC = () => {
  const { activeLeague, setActiveLeague, fixtures, standings, news, loading, leagues, activeLeagueData } = useSportsData();

  return (
    <div className="relative">
      {/* Warm orange light beam — stadium atmosphere */}
      <div className="absolute inset-0 -top-8 -bottom-8 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 40% at 35% 30%, rgba(249,115,22,0.05) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 65% 60%, rgba(249,115,22,0.03) 0%, transparent 60%)',
      }} />

      <div className="relative z-10 space-y-5">
        {/* League selector pills */}
        <div>
          <h3 className="text-[11px] text-white/20 uppercase tracking-wider px-4 mb-2 font-medium">Leagues</h3>
          <LeagueSelector leagues={leagues} activeId={activeLeague} onSelect={setActiveLeague} />
        </div>

        {/* Match day fixtures */}
        <div>
          <div className="flex items-center gap-2 px-4 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" style={{ boxShadow: '0 0 6px rgba(249,115,22,0.5)' }} />
            <h3 className="text-[15px] font-bold text-white/80">Match Day</h3>
          </div>
          <MatchDayCards fixtures={fixtures} isLoading={loading} />
        </div>

        {/* Standings table */}
        <div className="px-4">
          <StandingsWidget
            standings={standings}
            leagueName={activeLeagueData?.name || ''}
            isLoading={loading}
          />
        </div>

        {/* Sports News */}
        {(news.length > 0 || loading) && (
          <div>
            <div className="flex items-center gap-2 px-4 mb-2">
              <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">Latest</span>
            </div>
            <SportsNews headlines={news} isLoading={loading} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SportsArena;
