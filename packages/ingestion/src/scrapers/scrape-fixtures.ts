/** Scrape public fixtures pages. Run: pnpm ingest:fixtures */
import { upsertMatches } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizeFixtures } from '../normalizers/index.js';

runScraper({
  kind: 'fixtures',
  label: 'Fixtures',
  reportFile: 'scraper-run-report.md',
  normalize: normalizeFixtures,
  persist: upsertMatches,
}).catch((err) => {
  console.error('[scrape:fixtures] fatal:', err);
  process.exit(1);
});
