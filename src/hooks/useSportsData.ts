import { useState, useEffect } from 'react';
import { LEAGUES, fetchFixtures, fetchStandings, fetchNews, fetchRecentResults, getLeagueById } from '@/services/sports-data';
import type { Fixture, Standing, NewsHeadline } from '@/services/sports-data';

export function useSportsData() {
  const [activeLeague, setActiveLeague] = useState(LEAGUES[0].id);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [news, setNews] = useState<NewsHeadline[]>([]);
  const [recentResults, setRecentResults] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const league = getLeagueById(activeLeague);
    if (!league) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchFixtures(league),
      fetchStandings(league),
      fetchNews(league),
      fetchRecentResults(league),
    ]).then(([f, s, n, r]) => {
      if (cancelled) return;
      console.debug('[SPORTS] %s — fixtures:%d standings:%d news:%d results:%d', league.id, f.length, s.length, n.length, r.length);
      setFixtures(f);
      setStandings(s);
      setNews(n);
      setRecentResults(r);
    }).catch((err) => {
      console.warn('[SPORTS] fetch error:', err);
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
    news,
    recentResults,
    loading,
    leagues: LEAGUES,
    activeLeagueData: getLeagueById(activeLeague),
  };
}
