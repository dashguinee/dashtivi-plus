import React, { useState } from 'react';
import type { Standing } from '@/services/sports-data';

interface Props {
  standings: Standing[];
  leagueName: string;
  isLoading: boolean;
}

function StandingsWidgetInner({ standings, leagueName, isLoading }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Empty state — render nothing
  if (!isLoading && standings.length === 0) return null;

  // Detect if draws column should be hidden (e.g. NBA)
  const hasDraws = standings.some((s) => s.drawn > 0);

  // Determine visible rows
  const visibleStandings = expanded ? standings : standings.slice(0, 6);

  // Relegation zone: last 3 positions, only if table is large enough
  const relegationStart = standings.length > 10 ? standings.length - 2 : Infinity;

  const getRowBorder = (position: number): string => {
    if (position >= 1 && position <= 4) return 'border-l-2 border-green-500/30';
    if (position >= relegationStart) return 'border-l-2 border-red-500/30';
    return 'border-l-2 border-transparent';
  };

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[13px]">🏆</span>
        <span className="text-[14px] font-bold text-white/70">{leagueName}</span>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="text-[9px] text-white/20 uppercase tracking-wider">
            <th className="text-left w-5 pb-1.5">#</th>
            <th className="text-left pb-1.5">Team</th>
            <th className="w-6 text-center pb-1.5">P</th>
            <th className="w-6 text-center pb-1.5">W</th>
            {hasDraws && <th className="w-6 text-center pb-1.5">D</th>}
            <th className="w-6 text-center pb-1.5">L</th>
            <th className="w-6 text-center pb-1.5">Pts</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={hasDraws ? 7 : 6} className="py-1.5">
                    <div className="h-4 rounded bg-white/[0.04] animate-pulse" />
                  </td>
                </tr>
              ))
            : visibleStandings.map((s) => (
                <tr
                  key={s.team.id}
                  className={`text-[11px] font-mono hover:bg-white/[0.02] ${getRowBorder(s.position)}`}
                >
                  <td className="text-white/30 w-5 py-1.5">{s.position}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={s.team.logo}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                        loading="lazy"
                      />
                      <span className="truncate text-white/70">{s.team.shortName}</span>
                    </div>
                  </td>
                  <td className="text-white/30 w-6 text-center py-1.5">{s.played}</td>
                  <td className="text-white/30 w-6 text-center py-1.5">{s.won}</td>
                  {hasDraws && (
                    <td className="text-white/30 w-6 text-center py-1.5">{s.drawn}</td>
                  )}
                  <td className="text-white/30 w-6 text-center py-1.5">{s.lost}</td>
                  <td className="font-bold text-white/80 w-6 text-center py-1.5">{s.points}</td>
                </tr>
              ))}
        </tbody>
      </table>

      {/* Toggle button */}
      {!isLoading && standings.length > 6 && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-[10px] text-orange-400/60 hover:text-orange-400 transition-colors"
        >
          {expanded ? 'Collapse' : 'Show full table'}
        </button>
      )}
    </div>
  );
}

export const StandingsWidget = React.memo(StandingsWidgetInner);
