/** Validate ingested (or mock) data against the Zod schemas. Run: pnpm validate:data */
import { makeLogger } from './lib/logger.js';
import { runValidation } from './lib/validate.js';

const log = makeLogger('validate');
const res = runValidation();

log.info(`source: ${res.source}`);
for (const e of res.entities) {
  log.info(`${e.entity}: ${e.valid}/${e.total} valid${e.invalid ? `, ${e.invalid} invalid` : ''}`);
}
for (const e of res.entities) {
  for (const err of e.errors.slice(0, 10)) log.warn(err);
}

if (res.totalInvalid > 0) {
  log.error(`${res.totalInvalid} invalid record(s). See messages above.`);
  process.exit(1);
} else {
  log.info('All records pass validation.');
}
