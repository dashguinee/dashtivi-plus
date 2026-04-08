import { useState, useEffect } from 'react';
import { LEAGUES, fetchFixtures, fetchStandings, getLeagueById } from '@/services/sports-data';
import type { Fixture, Standing } from '@/services/sports-data';

export function useSportsData() {
  const [activeLeague, setActiveLeague] = useState(LEAGUES[0].id);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const league = getLeagueById(activeLeague);
    if (!league) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchFixtures(league),
      fetchStandings(league),
    ]).then(([f, s]) => {
      if (cancelled) return;
      setFixtures(f);
      setStandings(s);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeLeague]);

  return {
    activeLeague,
    setActiveLeague,
    fixtures,
    standings,
    loading,
    leagues: LEAGUES,
    activeLeagueData: getLeagueById(activeLeague),
  };
}
