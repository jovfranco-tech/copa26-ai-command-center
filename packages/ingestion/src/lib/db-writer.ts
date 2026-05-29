/**
 * Writes validated, normalized records into the local SQLite store. All writes
 * are idempotent upserts keyed by the natural domain id. Used only after Zod
 * validation passes. If the DB file does not exist, callers should skip persist.
 */
import { and, eq } from 'drizzle-orm';
import { dbFileExists, getDb, schema } from '@worldcup/db';
import type { Match, Player, Team, Venue } from '@worldcup/shared';
import type { DownloadedAsset } from './asset-downloader.js';

export interface UpsertCount {
  created: number;
  updated: number;
}

export function dbReady(): boolean {
  return dbFileExists();
}

export async function upsertTeams(teams: Team[]): Promise<UpsertCount> {
  const db = getDb();
  let created = 0;
  let updated = 0;
  for (const t of teams) {
    const values = {
      fifaId: t.code,
      name: t.name,
      slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      countryCode: t.code,
      groupName: t.group,
      ranking: t.ranking ?? null,
      colorA: t.colorA,
      colorB: t.colorB,
      confederation: t.confederation ?? null,
    };
    const existing = await db.select().from(schema.teams).where(eq(schema.teams.countryCode, t.code));
    if (existing.length) {
      await db.update(schema.teams).set(values).where(eq(schema.teams.id, existing[0]!.id));
      updated++;
    } else {
      await db.insert(schema.teams).values(values);
      created++;
    }
  }
  return { created, updated };
}

export async function upsertVenues(venues: Venue[]): Promise<UpsertCount> {
  const db = getDb();
  let created = 0;
  let updated = 0;
  for (const v of venues) {
    const values = {
      fifaId: v.id,
      name: v.stadium,
      city: v.city,
      country: v.country,
      capacity: v.capacity ?? null,
      surface: v.surface,
    };
    const existing = await db.select().from(schema.venues).where(eq(schema.venues.fifaId, v.id));
    if (existing.length) {
      await db.update(schema.venues).set(values).where(eq(schema.venues.id, existing[0]!.id));
      updated++;
    } else {
      await db.insert(schema.venues).values(values);
      created++;
    }
  }
  return { created, updated };
}

async function teamIdMap(): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db.select().from(schema.teams);
  return new Map(rows.map((r) => [r.countryCode, r.id]));
}

async function venueIdMap(): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db.select().from(schema.venues);
  return new Map(rows.map((r) => [r.fifaId ?? '', r.id]));
}

export async function upsertPlayers(players: Player[]): Promise<UpsertCount> {
  const db = getDb();
  const teamIds = await teamIdMap();
  let created = 0;
  let updated = 0;
  for (const p of players) {
    const values = {
      fifaId: p.id,
      teamId: teamIds.get(p.team) ?? null,
      name: p.name,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      position: p.pos,
      club: p.club,
      age: p.age ?? null,
      shirtNumber: p.number ?? null,
      profileUrl: p.profileUrl ?? null,
      goals: p.goals,
      assists: p.assists,
      minutes: p.minutes,
      yellowCards: p.yellow,
      redCards: p.red,
    };
    const existing = await db.select().from(schema.players).where(eq(schema.players.fifaId, p.id));
    if (existing.length) {
      await db.update(schema.players).set(values).where(eq(schema.players.id, existing[0]!.id));
      updated++;
    } else {
      await db.insert(schema.players).values(values);
      created++;
    }
  }
  return { created, updated };
}

export async function upsertMatches(matches: Match[]): Promise<UpsertCount> {
  const db = getDb();
  const teamIds = await teamIdMap();
  const venueIds = await venueIdMap();
  let created = 0;
  let updated = 0;
  for (const m of matches) {
    const values = {
      fifaId: m.id,
      homeTeamId: teamIds.get(m.home) ?? null,
      awayTeamId: teamIds.get(m.away) ?? null,
      dateUtc: m.date,
      localTime: m.time,
      venueId: venueIds.get(m.venue) ?? null,
      stage: m.stage,
      groupName: m.group,
      status: m.status,
      homeScore: m.homeGoals,
      awayScore: m.awayGoals,
      minute: m.minute,
      matchday: m.matchday,
      possessionHome: m.possH,
      shotsHome: m.shotsH,
      shotsAway: m.shotsA,
      shotsTargetHome: m.shotsTH,
      shotsTargetAway: m.shotsTA,
    };
    const existing = await db.select().from(schema.matches).where(eq(schema.matches.fifaId, m.id));
    if (existing.length) {
      await db.update(schema.matches).set(values).where(eq(schema.matches.id, existing[0]!.id));
      updated++;
    } else {
      await db.insert(schema.matches).values(values);
      created++;
    }
  }
  return { created, updated };
}

/** Record downloaded assets and link them onto their owning entity. */
export async function registerAssets(assets: DownloadedAsset[]): Promise<number> {
  const db = getDb();
  let n = 0;
  for (const a of assets) {
    const values = {
      entityType: a.entityType,
      entityId: a.entityId,
      assetType: a.assetType,
      sourceUrl: a.sourceUrl,
      localPath: a.localPath,
      mimeType: a.mimeType,
      originalFilename: a.originalFilename,
      downloadedAt: a.downloadedAt,
      status: a.status,
    };
    const existing = await db
      .select()
      .from(schema.assetRegistry)
      .where(
        and(
          eq(schema.assetRegistry.entityType, a.entityType),
          eq(schema.assetRegistry.entityId, a.entityId),
          eq(schema.assetRegistry.assetType, a.assetType),
        ),
      );
    let assetId: number;
    if (existing.length) {
      assetId = existing[0]!.id;
      await db.update(schema.assetRegistry).set(values).where(eq(schema.assetRegistry.id, assetId));
    } else {
      const [row] = await db.insert(schema.assetRegistry).values(values).returning({ id: schema.assetRegistry.id });
      assetId = row!.id;
    }
    n++;

    const idStr = String(assetId);
    if (a.assetType === 'crest')
      await db.update(schema.teams).set({ crestAssetId: idStr }).where(eq(schema.teams.countryCode, a.entityId));
    else if (a.assetType === 'flag')
      await db.update(schema.teams).set({ flagAssetId: idStr }).where(eq(schema.teams.countryCode, a.entityId));
    else if (a.assetType === 'photo')
      await db.update(schema.players).set({ photoAssetId: idStr }).where(eq(schema.players.fifaId, a.entityId));
    else if (a.assetType === 'venue_image')
      await db.update(schema.venues).set({ imageAssetId: idStr }).where(eq(schema.venues.fifaId, a.entityId));
  }
  return n;
}

export async function recordSyncRun(run: {
  status: string;
  source: string;
  recordsCreated: number;
  recordsUpdated: number;
  assetsDownloaded: number;
  errorsCount: number;
}): Promise<void> {
  const db = getDb();
  await db.insert(schema.syncRuns).values({ ...run, finishedAt: new Date().toISOString() });
}
