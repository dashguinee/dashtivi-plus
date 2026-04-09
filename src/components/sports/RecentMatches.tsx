import React, { useState } from 'react';
import type { Fixture } from '@/services/sports-data';
import type { BroadcastChannel } from '@/services/sports-data';
import { tap } from '@/lib/haptics';

/**
 * Recent Matches — "Happening on DASH" style collection row.
 * Shows completed match cards with scores and "Watch Replay" pills
 * linking to beIN Xtra replay channels.
 */

interface Props {
  results: Fixture[];
  replayChannels: BroadcastChannel[];
  isLoading: boolean;
}

function RecentMatchesInner({ results, replayChannels, isLoading }: Props) {
  const [highlightsMatch, setHighlightsMatch] = useState<Fixture | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-[220px] h-[120px] rounded-xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!results.length) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3" data-haptic="lush">
        {results.slice(0, 12).map((match, i) => (
          <ResultCard key={match.id} match={match} index={i} replayChannels={replayChannels} onOpenHighlights={setHighlightsMatch} />
        ))}
      </div>

      {/* Highlights overlay */}
      {highlightsMatch && highlightsMatch.broadcast && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setHighlightsMatch(null)}
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl overflow-hidden"
            style={{ background: '#0A0A0A', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <img src={highlightsMatch.homeTeam.logo} alt="" className="w-6 h-6 rounded-full" />
                <span className="text-[13px] font-bold text-white/90">
                  {highlightsMatch.homeTeam.shortName} {highlightsMatch.homeScore} - {highlightsMatch.awayScore} {highlightsMatch.awayTeam.shortName}
                </span>
                <img src={highlightsMatch.awayTeam.logo} alt="" className="w-6 h-6 rounded-full" />
              </div>
              <button onClick={() => setHighlightsMatch(null)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 text-lg">&times;</button>
            </div>
            {/* ESPN highlights iframe */}
            <iframe
              src={highlightsMatch.broadcast}
              className="w-full border-0"
              style={{ height: '60vh' }}
              allow="autoplay; fullscreen"
              title="Match highlights"
            />
            {/* Replay channel pills */}
            {replayChannels.length > 0 && (
              <div className="p-3 border-t border-white/[0.06]">
                <span className="text-[9px] text-white/20 uppercase tracking-wider">Or watch full replay</span>
                <div className="flex gap-2 mt-2">
                  {replayChannels.slice(0, 3).map(ch => (
                    <button
                      key={ch.streamId}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'rgba(249,115,22,0.10)', color: 'rgba(249,115,22,0.70)', border: '1px solid rgba(249,115,22,0.15)' }}
                      onClick={() => { setHighlightsMatch(null); tap(); window.dispatchEvent(new CustomEvent('sports-play-channel', { detail: { streamId: ch.streamId, name: ch.name } })); }}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const ResultCard: React.FC<{ match: Fixture; index: number; replayChannels: BroadcastChannel[]; onOpenHighlights: (match: Fixture) => void }> = ({ match, index, replayChannels, onOpenHighlights }) => {
  const [expanded, setExpanded] = useState(false);
  const daysAgo = Math.floor((Date.now() - new Date(match.date).getTime()) / 86400000);
  const dateLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
  const hasHighlights = !!match.broadcast; // broadcast field reused for highlights URL

  return (
    <div
      className="flex-shrink-0 w-[220px] rounded-xl overflow-hidden card-press active:scale-[0.97]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(249,115,22,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        animation: index < 10 ? `vee-card-in 0.9s cubic-bezier(0.16,1,0.3,1) ${index * 100}ms both` : undefined,
      }}
      onClick={() => {
        tap();
        if (hasHighlights) {
          onOpenHighlights(match);
        } else {
          setExpanded(!expanded);
        }
      }}
    >
      <div className="p-3">
        {/* Date + league badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-white/25 font-medium">{dateLabel}</span>
          <div className="flex items-center gap-1.5">
            {hasHighlights && <span className="text-[8px] text-orange-400/50">Highlights</span>}
            <span className="text-[8px] text-orange-400/40 font-semibold uppercase tracking-wider">{match.league.name}</span>
          </div>
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <img src={match.homeTeam.logo} alt="" className="w-5 h-5 rounded-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-[11px] text-white/70 truncate">{match.homeTeam.shortName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <img src={match.awayTeam.logo} alt="" className="w-5 h-5 rounded-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-[11px] text-white/70 truncate">{match.awayTeam.shortName}</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[16px] font-bold text-white/90 font-mono leading-tight">{match.homeScore ?? 0}</span>
            <span className="text-[16px] font-bold text-white/90 font-mono leading-tight">{match.awayScore ?? 0}</span>
          </div>
        </div>

        {/* Replay channels — expand when no highlights */}
        {expanded && !hasHighlights && replayChannels.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/[0.04]">
            <span className="text-[8px] text-white/20 uppercase tracking-wider">Watch replay</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {replayChannels.slice(0, 3).map(ch => (
                <button
                  key={ch.streamId}
                  className="px-2 py-0.5 rounded text-[9px] font-semibold"
                  style={{ background: 'rgba(249,115,22,0.10)', color: 'rgba(249,115,22,0.70)', border: '1px solid rgba(249,115,22,0.12)' }}
                  onClick={(e) => { e.stopPropagation(); tap(); window.dispatchEvent(new CustomEvent('sports-play-channel', { detail: { streamId: ch.streamId, name: ch.name } })); }}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const RecentMatches = React.memo(RecentMatchesInner);
export default RecentMatches;
