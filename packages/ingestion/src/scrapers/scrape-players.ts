/** Scrape public squad pages. Run: pnpm ingest:players */
import { upsertPlayers } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizePlayers } from '../normalizers/index.js';

runScraper({
  kind: 'players',
  label: 'Players',
  reportFile: 'scraper-run-report.md',
  normalize: normalizePlayers,
  persist: upsertPlayers,
}).catch((err) => {
  console.error('[scrape:players] fatal:', err);
  process.exit(1);
});
