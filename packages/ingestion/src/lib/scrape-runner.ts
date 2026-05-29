/**
 * Shared scraper flow. Every scraper goes through here so the policy is applied
 * uniformly: empty-config short-circuit, robots check, cache, 4–10s delay,
 * concurrency 1, stop-on-block, Zod validation, optional persist, and a report.
 */
import { loadConfig, type IngestionConfig } from '../config.js';
import { writeJsonCache } from './cache.js';
import { dbReady, recordSyncRun, type UpsertCount } from './db-writer.js';
import { StopError } from './errors.js';
import { closeBrowser, extractRecords, fetchPage } from './fetcher.js';
import { preflight } from './guards.js';
import { makeLogger } from './logger.js';
import { Report } from './reporter.js';
import { RobotsChecker } from './robots.js';

export interface NormalizeResult<T> {
  ok: T[];
  bad: Array<{ raw: Record<string, string>; error: string }>;
}

export interface ScraperSpec<T> {
  kind: keyof IngestionConfig['sources'];
  label: string;
  reportFile: string;
  normalize: (records: Array<Record<string, string>>) => NormalizeResult<T>;
  persist: (ok: T[]) => Promise<UpsertCount>;
}

export async function runScraper<T>(spec: ScraperSpec<T>): Promise<void> {
  const log = makeLogger(`scrape:${spec.kind}`);
  const cfg = await loadConfig();
  preflight(log);

  const report = new Report(`Scraper run — ${spec.label}`);
  const urls = cfg.sources[spec.kind];
  const selectors = cfg.selectors[spec.kind];

  report
    .kv('Entity', spec.label)
    .kv('URLs configured', urls.length)
    .kv('User-Agent', cfg.userAgent)
    .kv('Delay window', `${cfg.minDelayMs}–${cfg.maxDelayMs} ms`)
    .kv('Concurrency', cfg.maxConcurrency);

  if (urls.length === 0) {
    log.info(`No URLs configured for "${spec.kind}". Nothing to do (safe default).`);
    report.h('Result').bullet('No source URLs configured — nothing was fetched. See ingestion_config.example.ts.');
    report.write(spec.reportFile);
    return;
  }
  if (!selectors) {
    log.warn(`No selectors configured for "${spec.kind}" — cannot parse. Stopping.`);
    report.h('Result').bullet('No selectors configured for this entity — cannot parse. Stopped.');
    report.write(spec.reportFile);
    return;
  }

  const robots = new RobotsChecker(cfg.userAgent, log);
  const rawAll: Array<Record<string, string>> = [];
  const fetched: string[] = [];
  let stopped: string | null = null;

  try {
    for (const url of urls) {
      const html = await fetchPage(url, cfg, robots, log);
      const recs = await extractRecords(html, selectors, cfg);
      log.info(`extracted ${recs.length} records from ${url}`);
      rawAll.push(...recs);
      fetched.push(url);
    }
  } catch (err) {
    if (err instanceof StopError) {
      stopped = err.message;
      log.stop(err.message);
    } else {
      await closeBrowser();
      throw err;
    }
  } finally {
    await closeBrowser();
  }

  const { ok, bad } = spec.normalize(rawAll);
  writeJsonCache(`${spec.kind}.normalized`, ok);

  let persisted: UpsertCount = { created: 0, updated: 0 };
  if (ok.length && dbReady()) {
    persisted = await spec.persist(ok);
    await recordSyncRun({
      status: stopped ? 'stopped' : 'ok',
      source: `scrape:${spec.kind}`,
      recordsCreated: persisted.created,
      recordsUpdated: persisted.updated,
      assetsDownloaded: 0,
      errorsCount: bad.length + (stopped ? 1 : 0),
    });
  } else if (ok.length) {
    log.warn('SQLite not found — wrote normalized JSON to scraped-cache/json only. Run `pnpm db:migrate` to persist.');
  }

  report
    .h('Fetched')
    .kv('Pages fetched', fetched.length)
    .kv('Raw records', rawAll.length)
    .kv('Valid', ok.length)
    .kv('Invalid', bad.length)
    .kv('DB created', persisted.created)
    .kv('DB updated', persisted.updated);
  if (stopped) report.h('Stopped (per policy)').bullet(stopped);
  if (bad.length) {
    report.h('Validation errors (first 20)');
    bad.slice(0, 20).forEach((b) => report.bullet(b.error));
  }
  report.write(spec.reportFile);

  log.info(`done. valid=${ok.length} invalid=${bad.length}${stopped ? ' (stopped early)' : ''}`);
  if (stopped) process.exitCode = 1;
}
