/** Generate reports/data-quality-report.md. Run: pnpm report:data */
import { makeLogger } from './lib/logger.js';
import { runQualityReport } from './lib/quality.js';

const log = makeLogger('report:data');
runQualityReport()
  .then((path) => log.info(`wrote ${path}`))
  .catch((err) => {
    log.error(String(err));
    process.exit(1);
  });
