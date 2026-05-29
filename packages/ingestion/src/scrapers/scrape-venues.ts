/** Scrape public venue pages. Run: pnpm ingest:venues */
import { upsertVenues } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizeVenues } from '../normalizers/index.js';

runScraper({
  kind: 'venues',
  label: 'Venues',
  reportFile: 'scraper-run-report.md',
  normalize: normalizeVenues,
  persist: upsertVenues,
}).catch((err) => {
  console.error('[scrape:venues] fatal:', err);
  process.exit(1);
});
