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
  const res = await fetch(WC_URL, { headers: { 'X-Auth-Token': token } });
  if (!res.ok) throw new Error(`football-data HTTP ${res.status}`);
  const body = (await res.json()) as { matches?: ProviderMatch[] };
  return mapProviderMatches(Array.isArray(body.matches) ? body.matches : []);
}
