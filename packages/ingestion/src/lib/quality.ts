/** Build reports/data-quality-report.md from the active dataset (+ DB stats). */
import { dbFileExists, getDb, schema } from '@worldcup/db';
import { loadSources } from './load-sources.js';
import { Report } from './reporter.js';
import { runValidation } from './validate.js';

export async function runQualityReport(): Promise<string> {
  const s = loadSources();
  const v = runValidation();
  const report = new Report('Data quality report');

  report
    .kv('Dataset source', s.source === 'mock' ? 'mock (no ingested data yet)' : 'normalized scrape cache')
    .kv('Teams', s.teams.length)
    .kv('Players', s.players.length)
    .kv('Matches', s.matches.length)
    .kv('Venues', s.venues.length);

  report.h('Schema validation');
  report.table(
    ['Schema', 'Total', 'Valid', 'Invalid'],
    v.entities.map((e) => [e.entity, e.total, e.valid, e.invalid]),
  );
  report.kv('Total invalid records', v.totalInvalid);

  // Coverage gaps
  const playersNoClub = s.players.filter((p) => !p.club).length;
  const playersNoAge = s.players.filter((p) => p.age == null).length;
  const playersNoNumber = s.players.filter((p) => p.number == null).length;
  const matchesNoVenue = s.matches.filter((m) => !m.venue).length;
  const teamsNoRanking = s.teams.filter((t) => t.ranking == null).length;

  report.h('Coverage gaps');
  report
    .kv('Players missing club', playersNoClub)
    .kv('Players missing age', playersNoAge)
    .kv('Players missing shirt number', playersNoNumber)
    .kv('Matches missing venue', matchesNoVenue)
    .kv('Teams missing ranking', teamsNoRanking);

  // Duplicate ids
  const dupTeam = duplicates(s.teams.map((t) => t.code));
  const dupPlayer = duplicates(s.players.map((p) => p.id));
  const dupMatch = duplicates(s.matches.map((m) => m.id));
  report.h('Duplicate ids');
  report
    .kv('Duplicate team codes', dupTeam.length ? dupTeam.join(', ') : 'none')
    .kv('Duplicate player ids', dupPlayer.length ? dupPlayer.join(', ') : 'none')
    .kv('Duplicate match ids', dupMatch.length ? dupMatch.join(', ') : 'none');

  // DB + asset stats
  report.h('Local SQLite store');
  if (dbFileExists()) {
    const db = getDb();
    const [teams, players, matches, venues, assets] = await Promise.all([
      db.select().from(schema.teams),
      db.select().from(schema.players),
      db.select().from(schema.matches),
      db.select().from(schema.venues),
      db.select().from(schema.assetRegistry),
    ]);
    report
      .kv('DB exists', 'yes')
      .kv('teams rows', teams.length)
      .kv('players rows', players.length)
      .kv('matches rows', matches.length)
      .kv('venues rows', venues.length)
      .kv('asset_registry rows', assets.length);
    const byType: Record<string, number> = {};
    for (const a of assets) byType[a.assetType] = (byType[a.assetType] ?? 0) + 1;
    report.kv('assets by type', Object.entries(byType).map(([k, n]) => `${k}:${n}`).join(', ') || 'none');
  } else {
    report.kv('DB exists', 'no — run pnpm db:migrate && pnpm db:seed (or ingest)');
  }

  return report.write('data-quality-report.md');
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}
