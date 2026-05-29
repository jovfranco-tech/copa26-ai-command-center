/**
 * The single data source for the API. It prefers the local SQLite store; if the
 * file is missing or empty (i.e. ingestion/seed has not run yet) it falls back to
 * the typed mock dataset and flags `source: 'mock'` so the UI can show the banner.
 *
 * DB rows are mapped back into the domain shape the UI expects, so screens never
 * need to know whether the bytes came from SQLite or the mock module.
 */
import { desc } from 'drizzle-orm';
import {
  POSITION_LONG,
  allGroupTables,
  buildStats,
  computeStandings,
  mock,
  type CacheMeta,
  type Confederation,
  type DataSourceKind,
  type Goalkeeper,
  type Match,
  type MatchEvent,
  type Player,
  type Position,
  type StandingRow,
  type StatsBundle,
  type SyncRun,
  type Team,
  type Venue,
} from '@worldcup/shared';
import { dbFileExists, dbFileSizeMB, getDb, schema } from '@worldcup/db';

export interface DomainBundle {
  source: DataSourceKind;
  teams: Team[];
  players: Player[];
  matches: Match[];
  venues: Venue[];
  goalkeepers: Goalkeeper[];
  events: MatchEvent[];
}

const TTL_MS = 3000;
let cache: { at: number; bundle: DomainBundle } | null = null;

function loadFromMock(): DomainBundle {
  return {
    source: 'mock',
    teams: mock.TEAMS,
    players: mock.PLAYERS,
    matches: mock.MATCHES,
    venues: mock.VENUES,
    goalkeepers: mock.GOALKEEPERS,
    events: mock.MATCH_EVENTS,
  };
}

async function loadFromSqlite(): Promise<DomainBundle | null> {
  const db = getDb();
  const [teamRows, venueRows, playerRows, matchRows, eventRows] = await Promise.all([
    db.select().from(schema.teams),
    db.select().from(schema.venues),
    db.select().from(schema.players),
    db.select().from(schema.matches),
    db.select().from(schema.matchEvents),
  ]);
  if (teamRows.length === 0) return null;

  const codeByTeamId = new Map<number, string>();
  for (const t of teamRows) codeByTeamId.set(t.id, t.countryCode);
  const venueDomainIdById = new Map<number, string>();
  for (const v of venueRows) venueDomainIdById.set(v.id, v.fifaId ?? String(v.id));
  const playerDomainIdById = new Map<number, string>();
  for (const p of playerRows) playerDomainIdById.set(p.id, p.fifaId ?? String(p.id));
  const matchDomainIdById = new Map<number, string>();
  for (const m of matchRows) matchDomainIdById.set(m.id, m.fifaId ?? String(m.id));

  const teams: Team[] = teamRows.map((r) => ({
    id: r.countryCode,
    code: r.countryCode,
    name: r.name,
    group: r.groupName ?? '',
    ranking: r.ranking ?? null,
    confederation: (r.confederation as Confederation | null) ?? undefined,
    colorA: r.colorA ?? '#2a3550',
    colorB: r.colorB ?? '#566080',
    flagAssetId: r.flagAssetId ?? null,
    crestAssetId: r.crestAssetId ?? null,
  }));

  const venues: Venue[] = venueRows.map((r) => ({
    id: r.fifaId ?? String(r.id),
    city: r.city ?? '',
    country: r.country ?? '',
    stadium: r.name,
    capacity: r.capacity ?? null,
    surface: r.surface ?? 'Grass',
    imageAssetId: r.imageAssetId ?? null,
  }));

  const players: Player[] = playerRows.map((r) => {
    const pos = (r.position as Position) ?? 'MF';
    return {
      id: r.fifaId ?? String(r.id),
      name: r.name,
      team: r.teamId != null ? (codeByTeamId.get(r.teamId) ?? '') : '',
      pos,
      posLong: POSITION_LONG[pos] ?? '',
      club: r.club ?? '',
      age: r.age ?? null,
      number: r.shirtNumber ?? null,
      goals: r.goals ?? 0,
      assists: r.assists ?? 0,
      minutes: r.minutes ?? 0,
      yellow: r.yellowCards ?? 0,
      red: r.redCards ?? 0,
      photoAssetId: r.photoAssetId ?? null,
      profileUrl: r.profileUrl ?? null,
    };
  });

  const matches: Match[] = matchRows.map((r) => ({
    id: r.fifaId ?? String(r.id),
    group: r.groupName ?? '',
    stage: r.stage ?? '',
    round: r.matchday != null ? `Matchday ${r.matchday}` : '',
    matchday: r.matchday ?? 0,
    home: r.homeTeamId != null ? (codeByTeamId.get(r.homeTeamId) ?? '') : '',
    away: r.awayTeamId != null ? (codeByTeamId.get(r.awayTeamId) ?? '') : '',
    homeGoals: r.homeScore,
    awayGoals: r.awayScore,
    status: (r.status as Match['status']) ?? 'UPCOMING',
    minute: r.minute,
    date: r.dateUtc ?? '',
    time: r.localTime ?? '',
    venue: r.venueId != null ? (venueDomainIdById.get(r.venueId) ?? '') : '',
    possH: r.possessionHome,
    shotsH: r.shotsHome,
    shotsA: r.shotsAway,
    shotsTH: r.shotsTargetHome,
    shotsTA: r.shotsTargetAway,
  }));

  const events: MatchEvent[] = eventRows.map((r) => ({
    id: String(r.id),
    matchId: r.matchId != null ? (matchDomainIdById.get(r.matchId) ?? '') : '',
    minute: r.minute ?? 0,
    stoppageTime: r.stoppageTime ?? null,
    team: r.teamId != null ? (codeByTeamId.get(r.teamId) ?? '') : '',
    player: r.playerId != null ? (playerDomainIdById.get(r.playerId) ?? null) : null,
    type: (r.eventType as MatchEvent['type']) ?? 'goal',
    description: r.description ?? '',
  }));

  // Goalkeeper saves are not first-class in the required schema; derive from any
  // GK-position players (empty unless GKs were ingested).
  const goalkeepers: Goalkeeper[] = players
    .filter((p) => p.pos === 'GK')
    .map((p) => ({ id: p.id, name: p.name, team: p.team, saves: 0, cleanSheets: 0, pos: 'GK' }));

  return { source: 'sqlite', teams, players, matches, venues, goalkeepers, events };
}

export async function loadBundle(): Promise<DomainBundle> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.bundle;
  let bundle: DomainBundle | null = null;
  if (dbFileExists()) {
    try {
      bundle = await loadFromSqlite();
    } catch (err) {
      console.warn('[local-api] SQLite read failed, falling back to mock:', (err as Error).message);
    }
  }
  if (!bundle) bundle = loadFromMock();
  cache = { at: Date.now(), bundle };
  return bundle;
}

/* ---------------- query helpers used by routes ---------------- */

export async function getStandings(): Promise<{
  source: DataSourceKind;
  groups: Record<string, StandingRow[]>;
}> {
  const b = await loadBundle();
  const table = computeStandings(b.teams, b.matches);
  const letters = [...new Set(b.teams.map((t) => t.group))].sort();
  return { source: b.source, groups: allGroupTables(letters, table) };
}

export async function getStats(): Promise<StatsBundle> {
  const b = await loadBundle();
  return buildStats(b.teams, b.players, b.matches, b.goalkeepers, b.source);
}

export async function getSyncStatus() {
  const b = await loadBundle();
  let lastRun: SyncRun | null = null;
  let assetsTracked = 0;
  let meta: CacheMeta = mock.META;

  if (b.source === 'sqlite') {
    const db = getDb();
    const [runs, assets] = await Promise.all([
      db.select().from(schema.syncRuns).orderBy(desc(schema.syncRuns.id)).limit(1),
      db.select().from(schema.assetRegistry),
    ]);
    assetsTracked = assets.length;
    const counts = { crests: 0, photos: 0, venues: 0, flags: 0 };
    for (const a of assets) {
      if (a.assetType === 'crest') counts.crests++;
      else if (a.assetType === 'photo') counts.photos++;
      else if (a.assetType === 'venue_image') counts.venues++;
      else if (a.assetType === 'flag') counts.flags++;
    }
    const run = runs[0];
    if (run) {
      lastRun = {
        id: run.id,
        startedAt: run.startedAt ?? '',
        finishedAt: run.finishedAt,
        status: run.status ?? '',
        source: run.source ?? '',
        recordsCreated: run.recordsCreated ?? 0,
        recordsUpdated: run.recordsUpdated ?? 0,
        assetsDownloaded: run.assetsDownloaded ?? 0,
        errorsCount: run.errorsCount ?? 0,
      };
    }
    meta = {
      lastSync: run?.finishedAt ?? 'never',
      cacheStatus: 'Local SQLite',
      assets: counts,
      db: 'worldcup.sqlite',
      sizeMB: dbFileSizeMB(),
      source: 'sqlite',
    };
  }

  return {
    source: b.source,
    meta,
    lastRun,
    dbExists: dbFileExists(),
    assetsTracked,
  };
}

export async function getAssetRecord(
  assetId: string,
): Promise<{ localPath: string; mimeType: string | null } | null> {
  if (!dbFileExists()) return null;
  const id = Number(assetId);
  if (!Number.isInteger(id)) return null;
  try {
    const db = getDb();
    const rows = await db.select().from(schema.assetRegistry);
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    return { localPath: row.localPath, mimeType: row.mimeType };
  } catch {
    return null;
  }
}
