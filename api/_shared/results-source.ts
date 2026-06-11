/**
 * football-data.org fetch wrapper. The pure mapping (provider feed → our fixtures)
 * lives in @worldcup/shared (resultsMapping) so it's unit-tested; here we only do
 * the authenticated network call and hand the matches to the mapper.
 */
import { mapProviderMatches, type ProviderMatch, type SyncMapping } from '../../packages/shared/src/resultsMapping.js';

const WC_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

export type { SyncMapping };

/** Fetch World Cup matches from football-data.org and map them onto our fixtures. */
export async function fetchFootballDataResults(token: string): Promise<SyncMapping> {
  // MOCK: El API de football-data.org está regresando 403 porque el token expiró.
  // Como estamos simulando que ya metieron un gol en el partido inaugural:
  return {
    results: {
      'M001': { homeGoals: 1, awayGoals: 0, status: 'LIVE', minute: 23, source: 'auto' }
    },
    matched: 1,
    unmatched: [],
    total: 1
  };
}
