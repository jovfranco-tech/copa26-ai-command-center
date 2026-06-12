/**
 * Pure mapping from a football-data.org-style match feed onto our fixtures.
 *
 * Mapping is by team pairing (home + away code), NOT by the provider's match
 * numbering, so it's robust to however the feed orders/ids its matches. Provider
 * teams resolve to our codes by their 3-letter `tla` (FIFA-style, usually identical
 * to ours) with a normalized-name fallback. Unmatched matches are reported, not
 * guessed — so a feed/our-data mismatch is visible instead of silently wrong.
 */
import { MATCHES, TEAMS, PLAYERS } from './dataset/index.js';
import type { ResultEntry, PlayerStatsEntry } from './liveOverlay.js';

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

export interface ProviderScorer {
  player: { name: string };
  team: ProviderTeam;
  goals: number | null;
  assists: number | null;
}

import type { LineupEntry } from './liveOverlay.js';

export interface SyncMapping {
  results: Record<string, ResultEntry>;
  playerStats?: Record<string, PlayerStatsEntry>;
  lineups?: Record<string, LineupEntry>;
  matched: number;
  unmatched: { home?: string; away?: string }[];
  total: number;
}

export function mapProviderScorers(providerScorers: ProviderScorer[]): Record<string, PlayerStatsEntry> {
  const codes = new Set(TEAMS.map((t) => t.code));
  const out: Record<string, PlayerStatsEntry> = {};
  for (const s of providerScorers) {
    if (!s.player?.name || !s.team?.tla) continue;
    
    // Resolve team TLA using aliases just like in mapProviderMatches
    let teamCode = s.team.tla;
    if (!codes.has(teamCode)) {
      teamCode = Object.keys(PROVIDER_TLA_ALIAS).find(k => PROVIDER_TLA_ALIAS[k as keyof typeof PROVIDER_TLA_ALIAS] === teamCode) || teamCode;
      teamCode = PROVIDER_TLA_ALIAS[teamCode as keyof typeof PROVIDER_TLA_ALIAS] ?? teamCode;
    }
    
    const roster = PLAYERS.filter((p) => p.team === teamCode);
    const rawName = s.player.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const parts = rawName.split(/[^a-z]+/).filter(Boolean);
    const n = normalize(s.player.name);
    
    let p = roster.find((player) => normalize(player.name) === n);
    if (!p) {
      // Try fuzzy matching: check if every part of the provider name is present in our player's normalized name
      p = roster.find((player) => {
        const pNorm = normalize(player.name);
        return parts.length > 0 && parts.every((part) => pNorm.includes(part));
      });
    }

    if (!p) continue; // Unmatched player
      if (s.goals || s.assists) {
        out[p.id] = { goals: s.goals ?? 0, assists: s.assists ?? 0, yellow: 0, red: 0, saves: 0 };
      };
  }
  return out;
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

// API-Football mappers
export function mapApiFootballFixtures(
  fixtures: any[],
  lineups: any[],
  matchPlayerStats: any[],
  topScorers: any[],
  topAssists: any[],
  topYellow: any[],
  topRed: any[]
): SyncMapping {
  const byName = new Map(TEAMS.map((t) => [normalize(t.name), t.code]));
  
  const resolve = (name?: string): string | null => {
    if (!name) return null;
    const n = normalize(name);
    if (byName.has(n)) return byName.get(n)!;
    for (const [k, code] of byName) if (k.includes(n) || n.includes(k)) return code;
    return null;
  };

  const ours = new Map<string, string>();
  for (const m of MATCHES) ours.set(`${m.home}|${m.away}`, m.id);

  const results: Record<string, ResultEntry> = {};
  const unmatched: { home?: string; away?: string }[] = [];
  let matched = 0;

  const syncLineups: Record<string, LineupEntry> = {};

  for (const f of fixtures) {
    const statusShort = f.fixture?.status?.short;
    let status: 'probable' | 'confirmada' | 'LIVE' | 'HT' | 'FT' | null = null;
    if (['1H', '2H', 'ET', 'P', 'LIVE'].includes(statusShort)) status = 'LIVE';
    else if (statusShort === 'HT') status = 'HT';
    else if (['FT', 'AET', 'PEN'].includes(statusShort)) status = 'FT';
    
    if (!status) continue;

    const home = resolve(f.teams?.home?.name);
    const away = resolve(f.teams?.away?.name);
    if (!home || !away) {
      unmatched.push({ home: f.teams?.home?.name, away: f.teams?.away?.name });
      continue;
    }
    const id = ours.get(`${home}|${away}`);
    if (!id) {
      unmatched.push({ home, away });
      continue;
    }
    
    const hg = f.goals?.home;
    const ag = f.goals?.away;
    if (typeof hg !== 'number' || typeof ag !== 'number') continue;
    
    results[id] = {
      homeGoals: hg,
      awayGoals: ag,
      status: status === 'HT' ? 'LIVE' : status, // Fallback to LIVE since ResultEntry might not support HT
      minute: f.fixture?.status?.elapsed ?? null,
      source: 'auto'
    };
    matched++;

    // Map lineups if we have them for this fixture
    const matchLineups = lineups.find(l => l.fixture === f.fixture.id);
    if (matchLineups && Array.isArray(matchLineups.teams)) {
      const mapSheet = (teamName: string): any => {
        const teamCode = resolve(teamName);
        const lObj = matchLineups.teams.find((t: any) => resolve(t.team?.name) === teamCode);
        if (!lObj || !Array.isArray(lObj.startXI)) return undefined;
        
        const roster = PLAYERS.filter(p => p.team === teamCode);
        const starters = lObj.startXI.map((item: any) => {
          const name = item.player?.name || '';
          const posRaw = item.player?.pos || 'M';
          let pos: 'GK'|'DF'|'MF'|'FW' = 'MF';
          if (posRaw === 'G') pos = 'GK';
          if (posRaw === 'D') pos = 'DF';
          if (posRaw === 'F') pos = 'FW';
          
          const n = normalize(name);
          const parts = n.split(' ').filter(Boolean);
          let pMatch = roster.find(r => normalize(r.name) === n);
          if (!pMatch) {
            pMatch = roster.find((r) => {
              const pNorm = normalize(r.name);
              return parts.length > 0 && parts.every((part) => pNorm.includes(part));
            });
          }
          
          return {
            shirt: item.player?.number ?? 0,
            name,
            pos,
            playerId: pMatch?.id
          };
        });

        return {
          formation: lObj.formation || '4-3-3',
          manager: lObj.coach?.name || '',
          starters
        };
      };

      const homeSheet = mapSheet(f.teams?.home?.name);
      const awaySheet = mapSheet(f.teams?.away?.name);

      if (homeSheet || awaySheet) {
        syncLineups[id] = {
          status: 'confirmada',
          source: 'API-Football',
          home: homeSheet,
          away: awaySheet
        };
      }
    }
  }

  // Player Stats Mapping
  const playerStats: Record<string, PlayerStatsEntry> = {};
  
  const processStats = (players: any[]) => {
    for (const p of players) {
      const name = p.player?.name;
      const teamName = p.statistics?.[0]?.team?.name;
      const teamCode = resolve(teamName);
      if (!name || !teamCode) continue;

      const roster = PLAYERS.filter(r => r.team === teamCode);
      const n = normalize(name);
      const parts = n.split(' ').filter(Boolean);
      let matchedPlayer = roster.find(r => normalize(r.name) === n);
      if (!matchedPlayer) {
        matchedPlayer = roster.find((r) => {
          const pNorm = normalize(r.name);
          return parts.length > 0 && parts.every((part) => pNorm.includes(part));
        });
      }
      if (!matchedPlayer) continue;

      const stat = p.statistics?.[0] || {};
      const goals = stat.goals?.total || 0;
      const assists = stat.goals?.assists || 0;
      const saves = stat.goals?.saves || 0;
      const yellow = stat.cards?.yellow || 0;
      const red = stat.cards?.red || 0;

      if (!playerStats[matchedPlayer.id]) {
        playerStats[matchedPlayer.id] = { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
      }
      playerStats[matchedPlayer.id].goals += goals;
      playerStats[matchedPlayer.id].assists += assists;
      playerStats[matchedPlayer.id].yellow += yellow;
      playerStats[matchedPlayer.id].red += red;
      playerStats[matchedPlayer.id].saves += saves;
    }
  };

  processStats(topScorers);
  processStats(topAssists);
  processStats(topYellow);
  processStats(topRed);
  
  for (const matchStat of matchPlayerStats) {
    if (Array.isArray(matchStat.teams)) {
      matchStat.teams.forEach((t: any) => {
        if (Array.isArray(t.players)) processStats(t.players);
      });
    }
  }

  return { results, matched, unmatched, total: fixtures.length, playerStats, lineups: syncLineups };
}
