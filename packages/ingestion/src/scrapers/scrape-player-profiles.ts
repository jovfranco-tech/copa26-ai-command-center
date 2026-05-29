/** Scrape public player profile pages. Run: pnpm ingest:player-profiles */
import { upsertPlayers } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizePlayers } from '../normalizers/index.js';

runScraper({
  kind: 'playerProfiles',
  label: 'Player profiles',
  reportFile: 'scraper-run-report.md',
  normalize: normalizePlayers,
  persist: upsertPlayers,
}).catch((err) => {
  console.error('[scrape:player-profiles] fatal:', err);
  process.exit(1);
});
