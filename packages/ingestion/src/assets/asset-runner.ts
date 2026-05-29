/**
 * Shared asset-download flow. Same policy as the scrapers: robots.txt honored,
 * 4–10s delay, concurrency 1, stop-on-block. Saves into private-assets/,
 * registers each file in asset_registry, and writes an asset-download report.
 */
import { loadConfig } from '../config.js';
import type { AssetEntityType, AssetType } from '@worldcup/shared';
import { downloadAsset, type DownloadedAsset } from '../lib/asset-downloader.js';
import { dbReady, recordSyncRun, registerAssets } from '../lib/db-writer.js';
import { StopError } from '../lib/errors.js';
import { preflight } from '../lib/guards.js';
import { makeLogger } from '../lib/logger.js';
import { Report } from '../lib/reporter.js';
import { RobotsChecker } from '../lib/robots.js';
import { writeJsonCache } from '../lib/cache.js';

export interface AssetJob {
  label: string;
  assetType: AssetType;
  entityType: AssetEntityType;
  targetsKey: 'flags' | 'crests' | 'playerPhotos' | 'venueImages';
}

export async function runAssetJobs(jobs: AssetJob[], reportTitle: string, reportFile: string): Promise<void> {
  const log = makeLogger('assets');
  const cfg = await loadConfig();
  preflight(log);

  const report = new Report(reportTitle);
  const robots = new RobotsChecker(cfg.userAgent, log);
  const all: DownloadedAsset[] = [];
  const errors: string[] = [];
  let stopped: string | null = null;

  outer: for (const job of jobs) {
    const targets = cfg.assets[job.targetsKey];
    report.h(`${job.label} (${targets.length} target${targets.length === 1 ? '' : 's'})`);
    if (targets.length === 0) {
      report.bullet('No URLs configured — nothing downloaded (safe default).');
      continue;
    }
    for (const t of targets) {
      try {
        const asset = await downloadAsset(
          { entityType: job.entityType, entityId: t.entityId, assetType: job.assetType, url: t.url },
          cfg,
          robots,
          log,
        );
        all.push(asset);
        report.bullet(`${t.entityId} → ${asset.localPath} (${asset.mimeType})`);
      } catch (err) {
        if (err instanceof StopError) {
          stopped = err.message;
          log.stop(err.message);
          break outer;
        }
        errors.push(`${t.entityId} (${t.url}): ${(err as Error).message}`);
        report.bullet(`ERROR ${t.entityId}: ${(err as Error).message}`);
      }
    }
  }

  writeJsonCache('assets.downloaded', all);

  let registered = 0;
  if (all.length && dbReady()) {
    registered = await registerAssets(all);
    await recordSyncRun({
      status: stopped ? 'stopped' : 'ok',
      source: 'assets',
      recordsCreated: 0,
      recordsUpdated: 0,
      assetsDownloaded: registered,
      errorsCount: errors.length + (stopped ? 1 : 0),
    });
  } else if (all.length) {
    log.warn('SQLite not found — assets saved to private-assets/ but not registered. Run `pnpm db:migrate`.');
  }

  report
    .h('Summary')
    .kv('Downloaded', all.length)
    .kv('Registered in DB', registered)
    .kv('Errors', errors.length)
    .kv('Stopped', stopped ? 'yes' : 'no');
  if (stopped) report.h('Stopped (per policy)').bullet(stopped);
  report.write(reportFile);

  log.info(`assets done. downloaded=${all.length} errors=${errors.length}${stopped ? ' (stopped)' : ''}`);
  if (stopped) process.exitCode = 1;
}
