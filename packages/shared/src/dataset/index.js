/**
 * REAL World Cup 2026 dataset — generated from source dataset by
 * `pnpm --filter @worldcup/ingestion import:schedule` into
 * ../data/worldcup2026.json.
 *
 * Real teams, groups, venues and the full match schedule. Players, results,
 * standings and stats are EMPTY on purpose: the tournament has not been played
 * yet (kickoff 2026-06-11), so that data does not exist. It will populate once
 * matches are played (and, locally, once you ingest squads).
 */
// `with { type: 'json' }` is required by the Node ESM loader (Vercel Functions
// import this at runtime); Vite/TS handle it fine for the web build.
import dataset from '../data/worldcup2026.json' with { type: 'json' };
import { SQUADS } from '../data/squads.js';
import { POSITION_LONG } from '../constants.js';
export const ATTRIBUTION = dataset.meta;
export const TEAMS = dataset.teams;
export const VENUES = dataset.venues;
export const MATCHES = dataset.matches;
export const GROUPS = dataset.groups;
export const teamByCode = Object.fromEntries(TEAMS.map((t) => [t.code, t]));
export const venueById = Object.fromEntries(VENUES.map((v) => [v.id, v]));
// Curated current internationals (facts; not the official squad). Tournament
// stats are 0 — the World Cup has not been played yet.
export const PLAYERS = Object.entries(SQUADS).flatMap(([team, entries]) => entries.map(([name, pos, club, age, shirt], i) => ({
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
    saves: 0,
    photoAssetId: null,
    profileUrl: null,
})));
export const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
export const GOALKEEPERS = [];
export const MATCH_EVENTS = [];
export const BRACKET = { r32: [] };
export const ALERTS = [];
export const FAV_DEFAULTS = {
    teams: [],
    players: [],
    matches: [],
};
/** Opening day of the tournament; used as the dashboard's focus anchor. */
export const TODAY = '2026-06-11';
export const META = {
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
