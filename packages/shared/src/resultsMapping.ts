/**
 * Pure mapping from a football-data.org-style match feed onto our fixtures.
 *
 * Mapping is by team pairing (home + away code), NOT by the provider's match
 * numbering, so it's robust to however the feed orders/ids its matches. Provider
 * teams resolve to our codes by their 3-letter `tla` (FIFA-style, usually identical
 * to ours) with a normalized-name fallback. Unmatched matches are reported, not
 * guessed — so a feed/our-data mismatch is visible instead of silently wrong.
 */
import { MATCHES, TEAMS } from './dataset/index.js';
import type { ResultEntry } from './liveOverlay.js';

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

/**
 * football-data.org TLAs that differ from our team codes. Verified against the
 * live WC feed: every qualified team matches except Uruguay (URY vs our URU).
 * Add more here if a provider code ever diverges.
 */
const PROVIDER_TLA_ALIAS: Record<string, string> = {
  URY: 'URU',
};

/** football-data status → our overlay status (null = not played yet, skip). */
export function mapProviderStatus(s: string): 'FT' | 'LIVE' | null {
  if (s === 'FINISHED' || s === 'AWARDED') return 'FT';
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'LIVE';
  return null;
}

export interface ProviderTeam {
  tla?: string;
  name?: string;
}
export interface ProviderMatch {
  status?: string;
  minute?: number | null;
  homeTeam?: ProviderTeam;
  awayTeam?: ProviderTeam;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
}

export interface SyncMapping {
  results: Record<string, ResultEntry>;
  matched: number;
  unmatched: { home?: string; away?: string }[];
  total: number;
}

/** Map a provider match feed → { ourMatchId: result }. Pure + network-free. */
export function mapProviderMatches(providerMatches: ProviderMatch[]): SyncMapping {
  const codes = new Set(TEAMS.map((t) => t.code));
  const byName = new Map(TEAMS.map((t) => [normalize(t.name), t.code]));
  const resolve = (team?: ProviderTeam): string | null => {
    if (team?.tla) {
      const aliased = PROVIDER_TLA_ALIAS[team.tla] ?? team.tla;
      if (codes.has(aliased)) return aliased;
    }
    if (team?.name) {
      const n = normalize(team.name);
      if (n && byName.has(n)) return byName.get(n)!;
      for (const [k, code] of byName) if (k && n && (k.includes(n) || n.includes(k))) return code;
    }
    return null;
  };

  const ours = new Map<string, string>();
  for (const m of MATCHES) ours.set(`${m.home}|${m.away}`, m.id);

  const results: Record<string, ResultEntry> = {};
  const unmatched: { home?: string; away?: string }[] = [];
  let matched = 0;

  for (const pm of providerMatches) {
    const status = mapProviderStatus(String(pm?.status ?? ''));
    if (!status) continue; // not played yet
    const home = resolve(pm.homeTeam);
    const away = resolve(pm.awayTeam);
    if (!home || !away) {
      unmatched.push({ home: pm.homeTeam?.name, away: pm.awayTeam?.name });
      continue;
    }
    const id = ours.get(`${home}|${away}`);
    if (!id) {
      unmatched.push({ home, away });
      continue;
    }
    const hg = pm.score?.fullTime?.home;
    const ag = pm.score?.fullTime?.away;
    if (typeof hg !== 'number' || typeof ag !== 'number') continue;
    results[id] = {
      homeGoals: hg,
      awayGoals: ag,
      status,
      minute: typeof pm.minute === 'number' ? pm.minute : null,
      source: 'auto',
    };
    matched++;
  }

  return { results, matched, unmatched, total: providerMatches.length };
}
