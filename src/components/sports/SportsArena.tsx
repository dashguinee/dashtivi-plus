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
import { NewsTicker } from '@/components/ui/NewsTicker';
import { RecentMatches } from './RecentMatches';
import { useSportsData } from '@/hooks/useSportsData';
import { getLeagueChannels, REPLAY_CHANNELS } from '@/services/sports-data';
import type { BroadcastChannel } from '@/services/sports-data';
import { tap } from '@/lib/haptics';

export const SportsArena: React.FC = () => {
  const { activeLeague, setActiveLeague, fixtures, standings, news, recentResults, loading, leagues, activeLeagueData } = useSportsData();

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

        {/* Recent Matches — replay rediffusions */}
        {(recentResults.length > 0 || loading) && (
          <div>
            <div className="flex items-center gap-2 px-4 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <h3 className="text-[15px] font-bold text-white/60">Recent Games</h3>
              <span className="text-[9px] text-white/15 ml-1">tap for replay</span>
            </div>
            <RecentMatches results={recentResults} replayChannels={REPLAY_CHANNELS} isLoading={loading} />
          </div>
        )}

        {/* Watch On — channel pills linked to DashTivi streams */}
        {(() => {
          const channels = getLeagueChannels(activeLeague);
          if (!channels.length) return null;
          return (
            <div>
              <div className="flex items-center gap-2 px-4 mb-2">
                <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">Watch on</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
                {channels.map((ch: BroadcastChannel) => (
                  <button
                    key={ch.streamId}
                    onPointerDown={() => tap()}
                    onClick={() => {
                      // Dispatch custom event that ExperienceHomePage can catch to play this channel
                      window.dispatchEvent(new CustomEvent('sports-play-channel', { detail: { streamId: ch.streamId, name: ch.name } }));
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold card-press active:scale-[0.96]"
                    style={{
                      background: 'rgba(249,115,22,0.08)',
                      border: '1px solid rgba(249,115,22,0.18)',
                      color: 'rgba(249,115,22,0.75)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Standings table */}
        <div className="px-4">
          <StandingsWidget
            standings={standings}
            leagueName={activeLeagueData?.name || ''}
            isLoading={loading}
          />
        </div>

        {/* Sports News — ESPN headlines via unified NewsTicker */}
        {(news.length > 0 || loading) && (
          <div>
            <div className="flex items-center gap-2 px-4 mb-2">
              <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">Latest</span>
            </div>
            <NewsTicker
              items={news.map(n => ({ id: n.id, title: n.headline, description: n.description, image: n.image, published: n.published, link: n.link, source: 'ESPN' }))}
              isLoading={loading}
              accent="rgba(249,115,22,0.3)"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SportsArena;
