/** Verify private dirs are gitignored. Run: pnpm check:local-only */
import { checkGitignore } from './lib/guards.js';
import { makeLogger } from './lib/logger.js';

const log = makeLogger('check:gitignore');
const res = checkGitignore(log);
if (res.ok) {
  log.info('OK — private-assets/, local-db/, scraped-cache/ are gitignored.');
} else {
  log.error(`Missing required .gitignore entries: ${res.missing.join(', ')}`);
  log.error('Downloaded data/assets could be committed. Fix .gitignore before ingesting.');
  process.exit(1);
}
