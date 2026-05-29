/**
 * Seed the local SQLite store from the typed mock dataset. Run: pnpm db:seed
 *
 * This exists so the SQLite read-path can be exercised without running the
 * scrapers. It writes the same plausible/fictional data the app shows in mock
 * mode, mapped into the normalized relational schema.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mock, computeStandings, groupTable, GROUP_LETTERS } from '@worldcup/shared';
import { getClient, getDb } from './client.js';
import { dbFileExists, REPO_ROOT } from './index.js';
import * as schema from './schema.js';

async function main() {
  if (!dbFileExists()) {
    console.error('[db:seed] No SQLite file yet. Run `pnpm db:migrate` first.');
    process.exit(1);
  }
  const db = getDb();
  console.log('[db:seed] Clearing existing rows…');
  // Order matters (children first).
  await db.delete(schema.matchEvents);
  await db.delete(schema.playerStats);
  await db.delete(schema.teamStats);
  await db.delete(schema.standings);
  await db.delete(schema.matches);
  await db.delete(schema.players);
  await db.delete(schema.venues);
  await db.delete(schema.teams);
  await db.delete(schema.assetRegistry);

  // --- venues ---
  const venueIdByFifa = new Map<string, number>();
  for (const v of mock.VENUES) {
    const [row] = await db
      .insert(schema.venues)
      .values({
        fifaId: v.id,
        name: v.stadium,
        city: v.city,
        country: v.country,
        capacity: v.capacity,
        surface: v.surface,
      })
      .returning({ id: schema.venues.id });
    venueIdByFifa.set(v.id, row!.id);
  }

  // --- teams ---
  const teamIdByCode = new Map<string, number>();
  for (const t of mock.TEAMS) {
    const [row] = await db
      .insert(schema.teams)
      .values({
        fifaId: t.code,
        name: t.name,
        slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        countryCode: t.code,
        groupName: t.group,
        ranking: t.ranking ?? null,
        colorA: t.colorA,
        colorB: t.colorB,
        confederation: t.confederation ?? null,
      })
      .returning({ id: schema.teams.id });
    teamIdByCode.set(t.code, row!.id);
  }

  // --- players ---
  const playerIdByDomain = new Map<string, number>();
  for (const p of mock.PLAYERS) {
    const [row] = await db
      .insert(schema.players)
      .values({
        fifaId: p.id,
        teamId: teamIdByCode.get(p.team) ?? null,
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
      })
      .returning({ id: schema.players.id });
    playerIdByDomain.set(p.id, row!.id);
  }

  // --- matches ---
  const matchIdByDomain = new Map<string, number>();
  for (const m of mock.MATCHES) {
    const venue = mock.venueById[m.venue];
    const [row] = await db
      .insert(schema.matches)
      .values({
        fifaId: m.id,
        homeTeamId: teamIdByCode.get(m.home) ?? null,
        awayTeamId: teamIdByCode.get(m.away) ?? null,
        dateUtc: m.date,
        localTime: m.time,
        venueId: venueIdByFifa.get(m.venue) ?? null,
        city: venue?.city ?? null,
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
      })
      .returning({ id: schema.matches.id });
    matchIdByDomain.set(m.id, row!.id);
  }

  // --- standings (derived) ---
  const table = computeStandings(mock.TEAMS, mock.MATCHES);
  for (const g of GROUP_LETTERS) {
    const rows = groupTable(g, table);
    for (const r of rows) {
      await db.insert(schema.standings).values({
        teamId: teamIdByCode.get(r.team) ?? null,
        groupName: r.group,
        played: r.P,
        wins: r.W,
        draws: r.D,
        losses: r.L,
        goalsFor: r.GF,
        goalsAgainst: r.GA,
        goalDifference: r.GD,
        points: r.Pts,
        rank: r.rank ?? null,
      });
    }
  }

  // --- match events ---
  for (const e of mock.MATCH_EVENTS) {
    await db.insert(schema.matchEvents).values({
      matchId: matchIdByDomain.get(e.matchId) ?? null,
      minute: e.minute,
      stoppageTime: e.stoppageTime ?? null,
      teamId: teamIdByCode.get(e.team) ?? null,
      playerId: e.player ? (playerIdByDomain.get(e.player) ?? null) : null,
      eventType: e.type,
      description: e.description ?? '',
    });
  }

  // --- register any local placeholder assets that already exist on disk ---
  let assetsRegistered = 0;
  for (const [dir, assetType] of [
    ['crests', 'crest'],
    ['flags', 'flag'],
  ] as const) {
    const abs = join(REPO_ROOT, 'private-assets', dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
      if (!file.endsWith('.svg') && !file.endsWith('.png') && !file.endsWith('.jpg')) continue;
      const code = file.replace(/\.[^.]+$/, '');
      if (!teamIdByCode.has(code)) continue;
      await db.insert(schema.assetRegistry).values({
        entityType: 'team',
        entityId: code,
        assetType,
        localPath: join('private-assets', dir, file),
        mimeType: file.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        originalFilename: file,
        status: 'placeholder',
      });
      assetsRegistered++;
    }
  }

  // --- sync run marker ---
  await db.insert(schema.syncRuns).values({
    finishedAt: new Date().toISOString(),
    status: 'ok',
    source: 'seed (mock data)',
    recordsCreated: mock.TEAMS.length + mock.PLAYERS.length + mock.MATCHES.length,
    recordsUpdated: 0,
    assetsDownloaded: assetsRegistered,
    errorsCount: 0,
  });

  getClient().close();
  console.log(
    `[db:seed] Done. ${mock.TEAMS.length} teams, ${mock.PLAYERS.length} players, ${mock.MATCHES.length} matches, ${assetsRegistered} local assets registered.`,
  );
}

main().catch((err) => {
  console.error('[db:seed] Failed:', err);
  process.exit(1);
});
