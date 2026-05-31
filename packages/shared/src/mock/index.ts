/**
 * REAL World Cup 2026 dataset — generated from source dataset by
 * `pnpm --filter @worldcup/ingestion import:schedule` into
 * ../data/worldcup2026.json. (Module kept at this path for back-compat; it is no
 * longer mock data.)
 *
 * Real teams, groups, venues and the full match schedule. Players, results,
 * standings and stats are EMPTY on purpose: the tournament has not been played
 * yet (kickoff 2026-06-11), so that data does not exist. It will populate once
 * matches are played (and, locally, once you ingest squads).
 */
import dataset from '../data/worldcup2026.json';
import { SQUADS } from '../data/squads.js';
import { POSITION_LONG } from '../constants.js';
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

// Curated current internationals (facts; not the official squad). Tournament
// stats are 0 — the World Cup has not been played yet.
export const PLAYERS: Player[] = Object.entries(SQUADS).flatMap(([team, entries]) =>
  entries.map(([name, pos, club, age, shirt], i) => ({
    id: `${team}-${i + 1}`,
    name,
    team,
    pos,
    posLong: POSITION_LONG[pos],
    club,
    age,
    number: shirt,
    goals: 0,
    assists: 0,
    minutes: 0,
    yellow: 0,
    red: 0,
    photoAssetId: null,
    profileUrl: null,
  })),
);
export const playerById: Record<string, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);
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
  lastSync: `Datos del torneo · ${dataset.meta.generatedAt}`,
  cacheStatus: 'Datos del torneo',
  assets: { crests: 0, photos: 0, venues: 0, flags: TEAMS.length },
  db: 'worldcup2026',
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
