/**
 * football-data.org fetch wrapper. The pure mapping (provider feed → our fixtures)
 * lives in @worldcup/shared (resultsMapping) so it's unit-tested; here we only do
 * the authenticated network call and hand the matches to the mapper.
 */
import { mapProviderMatches, mapProviderScorers, type ProviderMatch, type ProviderScorer, type SyncMapping } from '../../packages/shared/src/resultsMapping.js';

const WC_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

export type { SyncMapping };

export async function fetchFootballDataResults(token: string): Promise<SyncMapping> {
  const urlStr = process.env.RESULTS_SOURCE_URL || WC_URL;
  if (urlStr.includes('api-sports.io') || urlStr.includes('api-football')) {
    return fetchApiFootballResults(urlStr, token);
  }

  const [resMatches, resScorers] = await Promise.all([
    fetch(urlStr, { headers: { 'X-Auth-Token': token } }),
    fetch(urlStr.replace('/matches', '/scorers'), { headers: { 'X-Auth-Token': token } }).catch(() => null)
  ]);

  if (!resMatches.ok) throw new Error(`football-data HTTP ${resMatches.status}`);
  const bodyMatches = (await resMatches.json()) as { matches?: ProviderMatch[] };
  
  const mapping = mapProviderMatches(Array.isArray(bodyMatches.matches) ? bodyMatches.matches : []);

  if (resScorers && resScorers.ok) {
    const bodyScorers = (await resScorers.json()) as { scorers?: ProviderScorer[] };
    mapping.playerStats = mapProviderScorers(Array.isArray(bodyScorers.scorers) ? bodyScorers.scorers : []);
  }

  return mapping;
}

// API-Football specific fetch
import { mapApiFootballFixtures } from '../../packages/shared/src/resultsMapping.js';

async function fetchApiFootballResults(url: string, token: string): Promise<SyncMapping> {
  const headers = { 'x-apisports-key': token };
  
  // 1. Fetch all fixtures
  const resMatches = await fetch(url, { headers });
  if (!resMatches.ok) throw new Error(`api-football HTTP ${resMatches.status}`);
  const bodyMatches = await resMatches.json();
  if (bodyMatches.errors && Object.keys(bodyMatches.errors).length > 0) {
    throw new Error(`api-football Error: ${JSON.stringify(bodyMatches.errors)}`);
  }
  const fixtures = Array.isArray(bodyMatches.response) ? bodyMatches.response : [];
  
  const urlObj = new URL(url);
  const baseUrl = urlObj.origin;

  // 2. Identify active or today's/yesterday's matches to fetch detailed stats and lineups
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];
  const activeFixtures = fixtures.filter((f: any) => {
    const status = f.fixture?.status?.short;
    const date = f.fixture?.date ? f.fixture.date.split('T')[0] : '';
    // Fetch if match is live, or if it's scheduled/finished today or yesterday
    return date === today || date === yesterday || ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(status);
  });

  const lineups: any[] = [];
  const playerStats: any[] = [];

  // Limit to max 10 active fixtures to prevent blowing free tier 100 req/day limit
  for (const f of activeFixtures.slice(0, 10)) {
    const fixtureId = f.fixture.id;
    const [resLineups, resPlayers] = await Promise.all([
      fetch(`${baseUrl}/fixtures/lineups?fixture=${fixtureId}`, { headers }).catch(() => null),
      fetch(`${baseUrl}/fixtures/players?fixture=${fixtureId}`, { headers }).catch(() => null)
    ]);
    if (resLineups && resLineups.ok) {
      const data = await resLineups.json();
      if (Array.isArray(data.response) && data.response.length > 0) {
        lineups.push({ fixture: fixtureId, teams: data.response });
      }
    }
    if (resPlayers && resPlayers.ok) {
      const data = await resPlayers.json();
      if (Array.isArray(data.response) && data.response.length > 0) {
        playerStats.push({ fixture: fixtureId, teams: data.response });
      }
    }
  }

  // Fallback to top scorers for tournament-wide aggregation for older matches if we want (optional)
  const league = urlObj.searchParams.get('league') || '15';
  const season = urlObj.searchParams.get('season') || '2026';
  const [scorers, assists, yellow, red] = await Promise.all([
    fetch(`${baseUrl}/players/topscorers?league=${league}&season=${season}`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/players/topassists?league=${league}&season=${season}`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/players/topyellowcards?league=${league}&season=${season}`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`${baseUrl}/players/topredcards?league=${league}&season=${season}`, { headers }).then(r => r.ok ? r.json() : null)
  ]);

  return mapApiFootballFixtures(
    fixtures,
    lineups,
    playerStats,
    scorers?.response || [],
    assists?.response || [],
    yellow?.response || [],
    red?.response || []
  );
}
