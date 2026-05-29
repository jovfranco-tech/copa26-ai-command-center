/** Scrape public team listing pages. Run: pnpm ingest:teams */
import { upsertTeams } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizeTeams } from '../normalizers/index.js';

runScraper({
  kind: 'teams',
  label: 'Teams',
  reportFile: 'scraper-run-report.md',
  normalize: normalizeTeams,
  persist: upsertTeams,
}).catch((err) => {
  console.error('[scrape:teams] fatal:', err);
  process.exit(1);
});
