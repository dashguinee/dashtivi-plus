import React, { useState } from 'react';
import type { Fixture } from '@/services/sports-data';

interface Props {
  fixtures: Fixture[];
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Sort: live first, then scheduled ascending, then final descending
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<Fixture['status'], number> = {
  live: 0,
  scheduled: 1,
  final: 2,
};

function sortedFixtures(fixtures: Fixture[]): Fixture[] {
  return [...fixtures]
    .sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      if (a.status === 'final') {
        // final: descending by date (most recent first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      // scheduled / live: ascending by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
// Team Crest with fallback
// ---------------------------------------------------------------------------

const TeamCrest: React.FC<{ logo: string; name: string }> = ({ logo, name }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !logo) {
    return (
      <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-[13px] font-bold text-white/30">
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={name}
      className="w-9 h-9 rounded-full object-contain"
      onError={() => setFailed(true)}
    />
  );
};

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

const StatusBadge: React.FC<{ status: Fixture['status']; detail: string; date: string }> = ({
  status,
  detail,
  date,
}) => {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-semibold">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-400" />
        </span>
        LIVE {detail ? `\u2022 ${detail}` : ''}
      </span>
    );
  }

  if (status === 'final') {
    return <span className="text-[10px] text-white/15 font-medium">FT</span>;
  }

  // scheduled
  const time = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return <span className="text-[10px] text-white/20 font-medium">{time} GMT</span>;
};

// ---------------------------------------------------------------------------
// Skeleton Cards
// ---------------------------------------------------------------------------

const SkeletonCard: React.FC = () => (
  <div
    className="flex-shrink-0 w-[240px] rounded-2xl p-4 animate-pulse"
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="flex justify-end mb-3">
      <div className="h-4 w-12 rounded-full bg-white/[0.06]" />
    </div>
    <div className="flex items-center justify-between mb-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
        <div className="h-3 w-14 rounded bg-white/[0.06]" />
      </div>
      <div className="h-5 w-8 rounded bg-white/[0.06]" />
      <div className="flex flex-col items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
        <div className="h-3 w-14 rounded bg-white/[0.06]" />
      </div>
    </div>
    <div className="h-2.5 w-24 rounded bg-white/[0.06] mx-auto" />
  </div>
);

// ---------------------------------------------------------------------------
// Fixture Card
// ---------------------------------------------------------------------------

const FixtureCard: React.FC<{ fixture: Fixture; index: number }> = ({ fixture, index }) => {
  const isLive = fixture.status === 'live';
  const showScore = fixture.status === 'live' || fixture.status === 'final';

  return (
    <div
      className="flex-shrink-0 w-[240px] rounded-2xl card-press active:scale-[0.97]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: isLive
          ? '1px solid rgba(249,115,22,0.4)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isLive ? '0 0 20px rgba(249,115,22,0.10)' : undefined,
        animation:
          index < 12
            ? `vee-card-in 0.9s cubic-bezier(0.16,1,0.3,1) ${index * 100}ms both`
            : undefined,
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top row — status badge right-aligned */}
        <div className="flex justify-end">
          <StatusBadge status={fixture.status} detail={fixture.statusDetail} date={fixture.date} />
        </div>

        {/* Middle — two teams side by side */}
        <div className="flex items-center justify-between">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1.5">
            <TeamCrest logo={fixture.homeTeam.logo} name={fixture.homeTeam.name} />
            <span className="text-[11px] text-white/50 truncate max-w-[80px] text-center">
              {fixture.homeTeam.shortName || fixture.homeTeam.name}
            </span>
          </div>

          {/* Center — vs or score */}
          {showScore ? (
            <span className="text-[18px] font-bold text-white/90">
              {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-[13px] text-white/15 font-medium">vs</span>
          )}

          {/* Away team */}
          <div className="flex flex-col items-center gap-1.5">
            <TeamCrest logo={fixture.awayTeam.logo} name={fixture.awayTeam.name} />
            <span className="text-[11px] text-white/50 truncate max-w-[80px] text-center">
              {fixture.awayTeam.shortName || fixture.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Bottom — venue + broadcast */}
        <div className="flex flex-col items-center gap-1.5">
          {fixture.venue && (
            <p className="text-[9px] text-white/15 text-center truncate">{fixture.venue}</p>
          )}
          {fixture.broadcast && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold cursor-pointer"
              style={{
                background: 'rgba(249,115,22,0.10)',
                color: 'rgba(249,115,22,0.70)',
                border: '1px solid rgba(249,115,22,0.15)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-orange-500/50" />
              {fixture.broadcast}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// MatchDayCards (main export)
// ---------------------------------------------------------------------------

const MatchDayCards: React.FC<Props> = ({ fixtures, isLoading }) => {
  if (isLoading) {
    return (
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3"
        data-haptic="lush"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!fixtures.length) {
    return <p className="text-white/20 text-sm px-4">No upcoming matches</p>;
  }

  const sorted = sortedFixtures(fixtures);

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-hide scroll-fade px-4 pb-3"
      data-haptic="lush"
    >
      {sorted.map((fixture, i) => (
        <FixtureCard key={fixture.id} fixture={fixture} index={i} />
      ))}
    </div>
  );
};

export default React.memo(MatchDayCards);
