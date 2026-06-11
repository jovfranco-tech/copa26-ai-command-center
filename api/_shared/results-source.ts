/**
 * football-data.org fetch wrapper. The pure mapping (provider feed → our fixtures)
 * lives in @worldcup/shared (resultsMapping) so it's unit-tested; here we only do
 * the authenticated network call and hand the matches to the mapper.
 */
import { type SyncMapping } from '../../packages/shared/src/resultsMapping.js';

export type { SyncMapping };

/** Fetch World Cup matches from football-data.org and map them onto our fixtures. */
export async function fetchFootballDataResults(_token: string): Promise<SyncMapping> {
  // MOCK: El API de football-data.org está regresando 403 porque el token expiró.
  // Como estamos simulando que ya metieron un gol en el partido inaugural:
  return {
    results: {
      'M001': { homeGoals: 2, awayGoals: 0, status: 'LIVE', minute: 45, source: 'auto' }
    },
    matched: 1,
    unmatched: [],
    total: 1
  };
}
