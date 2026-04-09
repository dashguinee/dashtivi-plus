// =============================================================================
// DashTivi+ Sports Data Service
// ESPN public API integration for live scores, fixtures & standings
// =============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface League {
  id: string;
  espnSlug: string;      // e.g. 'eng.1' for Premier League
  sport: string;          // e.g. 'soccer', 'basketball', 'mma'
  name: string;           // e.g. 'Premier League'
  shortName: string;      // e.g. 'EPL'
  country: string;        // e.g. 'England'
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;           // ESPN CDN URL
}

export interface NewsHeadline {
  id: string;
  headline: string;
  description: string;
  image: string;
  published: string;
  link: string;
}

export interface Fixture {
  id: string;
  date: string;           // ISO date
  status: 'scheduled' | 'live' | 'final';
  statusDetail: string;   // e.g. '45' (minute), 'FT', 'HT', '3:00 PM'
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
  broadcast: string;      // TV channel name if available
  league: { id: string; name: string };
}

export interface Standing {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// ---------------------------------------------------------------------------
// League Config
// ---------------------------------------------------------------------------

export const LEAGUES: League[] = [
  { id: 'epl', espnSlug: 'eng.1', sport: 'soccer', name: 'Premier League', shortName: 'EPL', country: 'England' },
  { id: 'laliga', espnSlug: 'esp.1', sport: 'soccer', name: 'La Liga', shortName: 'Liga', country: 'Spain' },
  { id: 'ligue1', espnSlug: 'fra.1', sport: 'soccer', name: 'Ligue 1', shortName: 'L1', country: 'France' },
  { id: 'ucl', espnSlug: 'uefa.champions', sport: 'soccer', name: 'Champions League', shortName: 'UCL', country: 'Europe' },
  { id: 'seriea', espnSlug: 'ita.1', sport: 'soccer', name: 'Serie A', shortName: 'SA', country: 'Italy' },
  { id: 'bundesliga', espnSlug: 'ger.1', sport: 'soccer', name: 'Bundesliga', shortName: 'BL', country: 'Germany' },
  { id: 'nba', espnSlug: 'nba', sport: 'basketball', name: 'NBA', shortName: 'NBA', country: 'USA' },
  { id: 'ufc', espnSlug: 'ufc', sport: 'mma', name: 'UFC', shortName: 'UFC', country: 'USA' },
];

// ---------------------------------------------------------------------------
// LocalStorage Cache Helpers
// ---------------------------------------------------------------------------

function getCached<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function setCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// ESPN API Base
// ---------------------------------------------------------------------------

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

// ---------------------------------------------------------------------------
// Status mapping helpers
// ---------------------------------------------------------------------------

function mapEspnState(state: string): Fixture['status'] {
  switch (state) {
    case 'in': return 'live';
    case 'post': return 'final';
    default: return 'scheduled';
  }
}

const STATUS_SORT_ORDER: Record<Fixture['status'], number> = {
  live: 0,
  scheduled: 1,
  final: 2,
};

// ---------------------------------------------------------------------------
// Stat extraction helper
// ---------------------------------------------------------------------------

function findStat(stats: Array<{ name: string; value: string }>, name: string): number {
  const entry = stats.find((s) => s.name === name);
  return entry ? Number(entry.value) || 0 : 0;
}

// ---------------------------------------------------------------------------
// fetchFixtures
// ---------------------------------------------------------------------------

const FIXTURES_TTL = 15 * 60 * 1000; // 15 minutes

export async function fetchFixtures(league: League): Promise<Fixture[]> {
  const cacheKey = `sports-fixtures-${league.id}`;

  const cached = getCached<Fixture[]>(cacheKey, FIXTURES_TTL);
  if (cached) return cached;

  try {
    const url = `${ESPN_BASE}/${league.sport}/${league.espnSlug}/scoreboard`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = data?.events ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixtures: Fixture[] = events.map((event: any) => {
      const competition = event.competitions?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const competitors: any[] = competition?.competitors ?? [];

      const home = competitors.find((c) => c.homeAway === 'home');
      const away = competitors.find((c) => c.homeAway === 'away');

      const buildTeam = (c: typeof home): Team => ({
        id: c?.team?.id ?? '',
        name: c?.team?.displayName ?? 'TBD',
        shortName: c?.team?.abbreviation ?? '',
        logo: c?.team?.logo ?? '',
      });

      const status = mapEspnState(event.status?.type?.state ?? 'pre');
      const scoreHome = home?.score != null ? Number(home.score) : null;
      const scoreAway = away?.score != null ? Number(away.score) : null;

      return {
        id: String(event.id),
        date: event.date ?? '',
        status,
        statusDetail: event.status?.type?.shortDetail ?? '',
        homeTeam: buildTeam(home),
        awayTeam: buildTeam(away),
        homeScore: status === 'scheduled' ? null : scoreHome,
        awayScore: status === 'scheduled' ? null : scoreAway,
        venue: competition?.venue?.fullName ?? '',
        broadcast: competition?.broadcasts?.[0]?.names?.[0] ?? '',
        league: { id: league.id, name: league.name },
      };
    });

    // Sort: live first, then scheduled by date, then final
    fixtures.sort((a, b) => {
      const orderDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    setCache(cacheKey, fixtures);
    return fixtures;
  } catch (err) {
    console.warn(`[sports-data] fetchFixtures failed for ${league.id}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// fetchStandings
// ---------------------------------------------------------------------------

const STANDINGS_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchStandings(league: League): Promise<Standing[]> {
  const cacheKey = `sports-standings-${league.id}`;

  const cached = getCached<Standing[]>(cacheKey, STANDINGS_TTL);
  if (cached) return cached;

  try {
    const url = `${ESPN_BASE}/${league.sport}/${league.espnSlug}/standings`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = data?.children?.[0]?.standings?.entries ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const standings: Standing[] = entries.map((entry: any, idx: number) => {
      const stats: Array<{ name: string; value: string }> = entry.stats ?? [];

      const won = findStat(stats, 'wins');
      const lost = findStat(stats, 'losses');
      const drawn = findStat(stats, 'ties') || findStat(stats, 'draws');
      const played = findStat(stats, 'gamesPlayed') || (won + lost + drawn);
      const goalsFor = findStat(stats, 'pointsFor');
      const goalsAgainst = findStat(stats, 'pointsAgainst');
      const goalDifference = findStat(stats, 'pointDifferential') || (goalsFor - goalsAgainst);
      const points = findStat(stats, 'points') || won; // NBA fallback: wins as rank proxy

      return {
        position: idx + 1,
        team: {
          id: entry.team?.id ?? '',
          name: entry.team?.displayName ?? '',
          shortName: entry.team?.abbreviation ?? '',
          logo: entry.team?.logos?.[0]?.href ?? '',
        },
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
      };
    });

    setCache(cacheKey, standings);
    return standings;
  } catch (err) {
    console.warn(`[sports-data] fetchStandings failed for ${league.id}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getLeagueById
// ---------------------------------------------------------------------------

export function getLeagueById(id: string): League | undefined {
  return LEAGUES.find((l) => l.id === id);
}

// ---------------------------------------------------------------------------
// League → DashTivi Channel Mapping
// Which channels broadcast which leagues. Used for "Watch on" pills.
// Each entry: { name (display), streamIds (DashTivi stream_id for best quality) }
// ---------------------------------------------------------------------------

export interface BroadcastChannel {
  name: string;
  streamId: number;
}

const LEAGUE_CHANNELS: Record<string, BroadcastChannel[]> = {
  epl: [
    { name: 'Sky Sports PL', streamId: 186604 },
    { name: 'Sky Sports Main', streamId: 581305 },
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'TNT Sports 1', streamId: 186627 },
  ],
  laliga: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'beIN Sports 2', streamId: 652319 },
  ],
  ligue1: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'Canal+ Sport', streamId: 652329 },
  ],
  ucl: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'beIN Sports 2', streamId: 652319 },
    { name: 'TNT Sports 1', streamId: 186627 },
  ],
  seriea: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'Eleven Sports 1', streamId: 688309 },
  ],
  bundesliga: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'Sky Sport BL', streamId: 659431 },
  ],
  nba: [
    { name: 'NBA TV', streamId: 1010 },
    { name: 'beIN NBA', streamId: 652332 },
    { name: 'ESPN', streamId: 503 },
  ],
  ufc: [
    { name: 'beIN Sports 1', streamId: 138713 },
    { name: 'ESPN', streamId: 503 },
  ],
};

export function getLeagueChannels(leagueId: string): BroadcastChannel[] {
  return LEAGUE_CHANNELS[leagueId] || [];
}

// Replay/rediffusion channels — beIN Xtra shows recent match replays
export const REPLAY_CHANNELS: BroadcastChannel[] = [
  { name: 'beIN Xtra 4K', streamId: 652323 },
  { name: 'beIN Xtra HD', streamId: 652342 },
  { name: 'beIN Xtra 2', streamId: 652324 },
  { name: 'beIN Xtra 4', streamId: 652328 },
];

// ---------------------------------------------------------------------------
// fetchRecentResults — last 3 days of completed matches
// ---------------------------------------------------------------------------

const RESULTS_TTL = 30 * 60 * 1000; // 30 min

export async function fetchRecentResults(league: League): Promise<Fixture[]> {
  const cacheKey = `sports-results-${league.id}`;
  const cached = getCached<Fixture[]>(cacheKey, RESULTS_TTL);
  if (cached) return cached;

  try {
    // Fetch last 3 days
    const results: Fixture[] = [];
    const today = new Date();
    for (let d = 1; d <= 3; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

      const url = `${ESPN_BASE}/${league.sport}/${league.espnSlug}/scoreboard?dates=${dateStr}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const event of (data?.events ?? [])) {
        const state = event.status?.type?.state;
        if (state !== 'post') continue; // Only completed matches

        const competition = event.competitions?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const competitors: any[] = competition?.competitors ?? [];
        const home = competitors.find((c: any) => c.homeAway === 'home');
        const away = competitors.find((c: any) => c.homeAway === 'away');

        results.push({
          id: String(event.id),
          date: event.date ?? '',
          status: 'final',
          statusDetail: event.status?.type?.shortDetail ?? 'FT',
          homeTeam: { id: home?.team?.id ?? '', name: home?.team?.displayName ?? 'TBD', shortName: home?.team?.abbreviation ?? '', logo: home?.team?.logo ?? '' },
          awayTeam: { id: away?.team?.id ?? '', name: away?.team?.displayName ?? 'TBD', shortName: away?.team?.abbreviation ?? '', logo: away?.team?.logo ?? '' },
          homeScore: home?.score != null ? Number(home.score) : null,
          awayScore: away?.score != null ? Number(away.score) : null,
          venue: competition?.venue?.fullName ?? '',
          broadcast: '',
          league: { id: league.id, name: league.name },
        });
      }
    }

    // Most recent first
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn(`[sports-data] fetchRecentResults failed for ${league.id}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// fetchNews
// ---------------------------------------------------------------------------

const NEWS_TTL = 30 * 60 * 1000; // 30 min

export async function fetchNews(league: League): Promise<NewsHeadline[]> {
  const cacheKey = `sports-news-${league.id}`;
  const cached = getCached<NewsHeadline[]>(cacheKey, NEWS_TTL);
  if (cached) return cached;

  try {
    const url = `${ESPN_BASE}/${league.sport}/${league.espnSlug}/news?limit=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN news ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = data?.articles ?? [];

    const headlines: NewsHeadline[] = articles.map((a: any) => ({
      id: String(a.dataSourceIdentifier || a.id || Math.random()),
      headline: a.headline || '',
      description: a.description || '',
      image: a.images?.[0]?.url || '',
      published: a.published || '',
      link: a.links?.web?.href || '',
    }));

    setCache(cacheKey, headlines);
    return headlines;
  } catch (err) {
    console.warn(`[sports-data] fetchNews failed for ${league.id}:`, err);
    return [];
  }
}
