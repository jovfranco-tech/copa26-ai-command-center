/** Local-only guardrails: verify the sensitive dirs are gitignored. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@worldcup/db';
import type { Logger } from './logger.js';

const REQUIRED_IGNORES = ['private-assets/', 'local-db/', 'scraped-cache/'];

export interface GitignoreCheck {
  ok: boolean;
  missing: string[];
}

export function checkGitignore(log?: Logger): GitignoreCheck {
  const file = join(REPO_ROOT, '.gitignore');
  if (!existsSync(file)) {
    log?.warn('No .gitignore found at repo root! Private data could be committed.');
    return { ok: false, missing: REQUIRED_IGNORES };
  }
  const content = readFileSync(file, 'utf8');
  const missing = REQUIRED_IGNORES.filter(
    (entry) => !content.split('\n').some((l) => l.trim() === entry),
  );
  if (missing.length) {
    log?.warn(`.gitignore is missing required entries: ${missing.join(', ')}`);
    log?.warn('Add them before running ingestion so downloaded data stays out of git.');
  }
  return { ok: missing.length === 0, missing };
}

export function preflight(log: Logger): void {
  log.info('Local-only ingestion. Public pages only · robots.txt respected · 4–10s delay · concurrency 1.');
  log.info('No proxies · no stealth · no CAPTCHA bypass. On any block the run stops and reports.');
  checkGitignore(log);
}
