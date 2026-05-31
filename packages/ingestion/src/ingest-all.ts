/** Full ingestion pass: scrapers → assets → validate → quality report. Run: pnpm ingest:all */
import { runAssetJobs } from './assets/asset-runner.js';
import { upsertMatches, upsertPlayers, upsertTeams, upsertVenues } from './lib/db-writer.js';
import { makeLogger } from './lib/logger.js';
import { runQualityReport } from './lib/quality.js';
import { runScraper } from './lib/scrape-runner.js';
import { runValidation } from './lib/validate.js';
import {
  normalizeFixtures,
  normalizePlayers,
  normalizeTeams,
  normalizeVenues,
} from './normalizers/index.js';
import { downloadMediaAssets } from './scrapers/download-media-assets.js';

const log = makeLogger('ingest:all');

async function main() {
  log.info('Full ingestion pass: scrapers → assets → validate → report.');
  log.info('With the default (empty) config every step is a no-op — this is the safe default.');

  await runScraper({ kind: 'teams', label: 'Teams', reportFile: 'scraper-run-report.md', normalize: normalizeTeams, persist: upsertTeams });
  await runScraper({ kind: 'venues', label: 'Venues', reportFile: 'scraper-run-report.md', normalize: normalizeVenues, persist: upsertVenues });
  await runScraper({ kind: 'fixtures', label: 'Fixtures', reportFile: 'scraper-run-report.md', normalize: normalizeFixtures, persist: upsertMatches });
  await runScraper({ kind: 'players', label: 'Players', reportFile: 'scraper-run-report.md', normalize: normalizePlayers, persist: upsertPlayers });
  await runScraper({ kind: 'playerProfiles', label: 'Player profiles', reportFile: 'scraper-run-report.md', normalize: normalizePlayers, persist: upsertPlayers });
  await runScraper({ kind: 'matchStats', label: 'Match statistics', reportFile: 'scraper-run-report.md', normalize: normalizeFixtures, persist: upsertMatches });

  await runAssetJobs(
    [
      { label: 'Flags', assetType: 'flag', entityType: 'team', targetsKey: 'flags' },
      { label: 'Team crests', assetType: 'crest', entityType: 'team', targetsKey: 'crests' },
      { label: 'Player photos', assetType: 'photo', entityType: 'player', targetsKey: 'playerPhotos' },
      { label: 'Venue images', assetType: 'venue_image', entityType: 'venue', targetsKey: 'venueImages' },
    ],
    'Asset download — all types',
    'asset-download-report.md',
  );

  await downloadMediaAssets();

  const v = runValidation();
  log.info(`validation: source=${v.source}, totalInvalid=${v.totalInvalid}`);
  const reportPath = await runQualityReport();
  log.info(`wrote ${reportPath}`);
  log.info('Ingestion pass complete. See /reports for details.');
}

main().catch((err) => {
  log.error(String(err));
  process.exit(1);
});
