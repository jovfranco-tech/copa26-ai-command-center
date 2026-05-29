/**
 * REAL World Cup 2026 dataset — generated from openfootball (CC0) by
 * `pnpm --filter @worldcup/ingestion import:openfootball` into
 * ../data/worldcup2026.json. (Module kept at this path for back-compat; it is no
 * longer mock data.)
 *
 * Real teams, groups, venues and the full match schedule. Players, results,
 * standings and stats are EMPTY on purpose: the tournament has not been played
 * yet (kickoff 2026-06-11), so that data does not exist. It will populate once
 * matches are played (and, locally, once you ingest squads).
 */
import dataset from '../data/worldcup2026.json';
import type {
  CacheMeta,
  Goalkeeper,
  Match,
  MatchEvent,
  Player,
  Team,
  Venue,
} from '../types.js';

export const ATTRIBUTION = dataset.meta;

export const TEAMS: Team[] = dataset.teams as unknown as Team[];
export const VENUES: Venue[] = dataset.venues as unknown as Venue[];
export const MATCHES: Match[] = dataset.matches as unknown as Match[];
export const GROUPS = dataset.groups as Array<{ letter: string; teams: string[] }>;

export const teamByCode: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);
export const venueById: Record<string, Venue> = Object.fromEntries(
  VENUES.map((v) => [v.id, v]),
);

// Pre-tournament: no squads, results, events or knockout draw yet.
export const PLAYERS: Player[] = [];
export const playerById: Record<string, Player> = {};
export const GOALKEEPERS: Goalkeeper[] = [];
export const MATCH_EVENTS: MatchEvent[] = [];
export const BRACKET = { r32: [] as Array<[string, string]> };
export const ALERTS: Array<{ id: string; type: string; text: string; time: string; team: string }> =
  [];
export const FAV_DEFAULTS = {
  teams: [] as string[],
  players: [] as string[],
  matches: [] as string[],
};

/** Opening day of the tournament; used as the dashboard's focus anchor. */
export const TODAY = '2026-06-11';

export const META: CacheMeta = {
  lastSync: `Open data · ${dataset.meta.generatedAt}`,
  cacheStatus: 'Open data (CC0)',
  assets: { crests: 0, photos: 0, venues: 0, flags: TEAMS.length },
  db: 'worldcup2026 · openfootball',
  sizeMB: 0,
  source: 'mock',
};

export const mockData = {
  teams: TEAMS,
  players: PLAYERS,
  matches: MATCHES,
  venues: VENUES,
  goalkeepers: GOALKEEPERS,
  events: MATCH_EVENTS,
  bracket: BRACKET,
  alerts: ALERTS,
  meta: META,
  today: TODAY,
  groups: GROUPS,
  favDefaults: FAV_DEFAULTS,
};

export type MockData = typeof mockData;
