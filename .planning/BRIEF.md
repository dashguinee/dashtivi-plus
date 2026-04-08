# DashTivi+ Experience Evolution

## Vision
Each experience page gets its own personality. Starting with Sports — a digital arena where you walk in and see today's match, the table, the teams. Not a grid of channel icons.

## Current State
- 15 experiences, one uniform template (ExperienceHomePage.tsx)
- Template: hero → search → VEE picks → subtab pills → channel grid → social proof
- Zero experience-specific customization
- Sports has 273 channels, 11 subtypes, but no match data, no fixtures, no standings

## Phase 1: Sports Arena
Transform the Sports experience into a digital stadium.

### Data Sources (confirmed free, no API key for ESPN)
- **ESPN public API**: fixtures, scores, standings, team logos
  - `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`
  - Team logos: `a.espncdn.com/i/teamlogos/soccer/500/{id}.png`
- **TheSportsDB**: fanart, badges, league imagery (free key = `3`)
- **football-logos GitHub**: 2,700+ SVG/PNG fallback crests

### Leagues (priority order)
1. Premier League (eng.1)
2. La Liga (esp.1)
3. Ligue 1 (fra.1)
4. Champions League (uefa.champions)
5. Serie A (ita.1)
6. Bundesliga (ger.1)
7. NBA (basketball/nba)
8. UFC (mma/ufc)

### Target Files
- NEW: `src/services/sports-data.ts` — ESPN/TheSportsDB client
- NEW: `src/components/sports/MatchDayCards.tsx` — fixture cards
- NEW: `src/components/sports/LeagueSelector.tsx` — league hero pills
- NEW: `src/components/sports/StandingsWidget.tsx` — compact table
- MODIFY: `src/pages/ExperienceHomePage.tsx` — conditional Sports layout

## User
Dash (solo dev). React + TypeScript + Vite + Tailwind. DashTivi+ aesthetic: dark, purple accents, premium.
