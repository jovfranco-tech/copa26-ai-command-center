/**
 * Asset downloader. Plain fetch of a single public image, saved under
 * private-assets/ (gitignored) and recorded in asset_registry. robots.txt is
 * honored; no proxy, no evasion. Stops the run on any block.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { REPO_ROOT } from '@worldcup/db';
import type { AssetEntityType, AssetType } from '@worldcup/shared';
import type { IngestionConfig } from '../config.js';
import { StopError } from './errors.js';
import type { Logger } from './logger.js';
import { politeDelay } from './rate-limit.js';
import type { RobotsChecker } from './robots.js';

const MIME_BY_EXT: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export interface DownloadedAsset {
  entityType: AssetEntityType;
  entityId: string;
  assetType: AssetType;
  sourceUrl: string;
  localPath: string; // relative to repo root
  mimeType: string;
  originalFilename: string;
  downloadedAt: string;
  status: 'present' | 'error';
}

const FOLDER: Record<AssetType, string> = {
  flag: 'flags',
  crest: 'crests',
  logo: 'teams',
  photo: 'players',
  venue_image: 'venues',
};

export async function downloadAsset(
  opts: { entityType: AssetEntityType; entityId: string; assetType: AssetType; url: string },
  cfg: IngestionConfig,
  robots: RobotsChecker,
  log: Logger,
): Promise<DownloadedAsset> {
  const { url, assetType, entityId, entityType } = opts;
  if (!(await robots.allowed(url))) {
    throw new StopError(`robots.txt disallows asset ${url} — stopping (no override).`);
  }

  const ext = (extname(new URL(url).pathname) || '.png').toLowerCase();
  const folder = join(REPO_ROOT, 'private-assets', FOLDER[assetType]);
  mkdirSync(folder, { recursive: true });
  const filename = `${entityId}${ext}`;
  const abs = join(folder, filename);
  const rel = join('private-assets', FOLDER[assetType], filename);

  if (existsSync(abs) && !cfg.forceRefetch) {
    log.info(`asset cache hit → ${rel}`);
    return done('present');
  }

  await politeDelay(cfg);
  log.info(`downloading asset → ${url}`);
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'user-agent': cfg.userAgent } });
  } catch (err) {
    throw new StopError(`asset fetch failed for ${url}: ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new StopError(`asset blocked (HTTP ${res.status}) at ${url} — stopping per policy.`);
  }
  if (!res.ok) {
    throw new StopError(`asset HTTP ${res.status} at ${url} — stopping per policy.`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(abs, buf);
  const mime = res.headers.get('content-type')?.split(';')[0] || MIME_BY_EXT[ext] || 'application/octet-stream';
  return done('present', mime);

  function done(status: 'present' | 'error', mime?: string): DownloadedAsset {
    return {
      entityType,
      entityId,
      assetType,
      sourceUrl: url,
      localPath: rel,
      mimeType: mime ?? MIME_BY_EXT[ext] ?? 'application/octet-stream',
      originalFilename: basename(new URL(url).pathname) || filename,
      downloadedAt: new Date().toISOString(),
      status,
    };
  }
}
