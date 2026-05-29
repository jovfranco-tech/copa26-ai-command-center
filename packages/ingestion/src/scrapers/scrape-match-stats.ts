/** Scrape public match statistics pages. Run: pnpm ingest:match-stats */
import { upsertMatches } from '../lib/db-writer.js';
import { runScraper } from '../lib/scrape-runner.js';
import { normalizeFixtures } from '../normalizers/index.js';

runScraper({
  kind: 'matchStats',
  label: 'Match statistics',
  reportFile: 'scraper-run-report.md',
  normalize: normalizeFixtures,
  persist: upsertMatches,
}).catch((err) => {
  console.error('[scrape:match-stats] fatal:', err);
  process.exit(1);
});
