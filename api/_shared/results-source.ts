/**
 * football-data.org fetch wrapper. The pure mapping (provider feed → our fixtures)
 * lives in @worldcup/shared (resultsMapping) so it's unit-tested; here we only do
 * the authenticated network call and hand the matches to the mapper.
 */
import { mapProviderMatches, mapProviderScorers, type ProviderMatch, type ProviderScorer, type SyncMapping } from '../../packages/shared/src/resultsMapping.js';

const WC_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const SCORERS_URL = 'https://api.football-data.org/v4/competitions/WC/scorers';

export type { SyncMapping };

/** Fetch World Cup matches from football-data.org and map them onto our fixtures. */
export async function fetchFootballDataResults(token: string): Promise<SyncMapping> {
  const [resMatches, resScorers] = await Promise.all([
    fetch(WC_URL, { headers: { 'X-Auth-Token': token } }),
    fetch(SCORERS_URL, { headers: { 'X-Auth-Token': token } }).catch(() => null)
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
