/**
 * Ingestion configuration. By DEFAULT everything is empty, so running any
 * `pnpm ingest:*` command does nothing until you deliberately add public URLs
 * and selectors. See ../../scraper_policy.md for the rules every run obeys.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '@worldcup/db';

export interface AssetTarget {
  /** Domain id of the entity the asset belongs to (e.g. team code "ARG", player id "P001"). */
  entityId: string;
  /** Public URL of an image that is visible on a public page. */
  url: string;
}

export interface EntitySelectors {
  /** A selector that matches each record row/card on the page. */
  item: string;
  /** Field selectors, relative to each item. */
  fields: Record<string, string>;
}

export interface IngestionConfig {
  /** Honest, descriptive User-Agent. Never spoof a browser or rotate this. */
  userAgent: string;
  /** Conservative random delay window between requests (ms). */
  minDelayMs: number;
  maxDelayMs: number;
  /** Hard cap. Must remain 1 — do not raise. */
  maxConcurrency: 1;
  headless: boolean;
  /** When true, re-fetch even if a cached copy exists. Default false (use cache). */
  forceRefetch: boolean;
  /** Origin used to look up robots.txt (e.g. https://www.fifa.com). */
  robotsBase: string;
  /** Public page URLs to read, per entity. EMPTY by default. */
  sources: {
    fixtures: string[];
    teams: string[];
    players: string[];
    playerProfiles: string[];
    matchStats: string[];
    venues: string[];
  };
  /** CSS selectors for parsing each entity's public page. Adjust to the real DOM. */
  selectors: Partial<Record<keyof IngestionConfig['sources'], EntitySelectors>>;
  /** Public image URLs to download, per asset type. EMPTY by default. */
  assets: {
    flags: AssetTarget[];
    crests: AssetTarget[];
    playerPhotos: AssetTarget[];
    venueImages: AssetTarget[];
  };
}

export const DEFAULT_CONFIG: IngestionConfig = {
  userAgent:
    process.env.INGEST_USER_AGENT ??
    'FIFA-Private-Dashboard/0.1 (personal local research; respects robots.txt)',
  minDelayMs: Number(process.env.INGEST_MIN_DELAY_MS ?? 4000),
  maxDelayMs: Number(process.env.INGEST_MAX_DELAY_MS ?? 10000),
  maxConcurrency: 1,
  headless: process.env.INGEST_HEADLESS !== '0',
  forceRefetch: process.env.INGEST_FORCE_REFETCH === '1',
  robotsBase: process.env.INGEST_ROBOTS_BASE ?? 'https://www.fifa.com',
  sources: { fixtures: [], teams: [], players: [], playerProfiles: [], matchStats: [], venues: [] },
  selectors: {},
  assets: { flags: [], crests: [], playerPhotos: [], venueImages: [] },
};

/** Load DEFAULT_CONFIG, then merge an optional repo-root `ingestion.config.ts` if present. */
export async function loadConfig(): Promise<IngestionConfig> {
  let cfg: IngestionConfig = { ...DEFAULT_CONFIG };
  for (const name of ['ingestion.config.ts', 'ingestion.config.js']) {
    const file = join(REPO_ROOT, name);
    if (!existsSync(file)) continue;
    try {
      const mod = (await import(pathToFileURL(file).href)) as { default?: Partial<IngestionConfig> };
      if (mod.default) cfg = mergeConfig(cfg, mod.default);
      console.log(`[ingestion] loaded overrides from ${name}`);
    } catch (err) {
      console.warn(`[ingestion] failed to load ${name}:`, (err as Error).message);
    }
    break;
  }
  // Enforce the hard guardrails no matter what a config file says.
  cfg.maxConcurrency = 1;
  cfg.minDelayMs = Math.max(4000, cfg.minDelayMs);
  cfg.maxDelayMs = Math.max(cfg.minDelayMs, cfg.maxDelayMs);
  return cfg;
}

function mergeConfig(base: IngestionConfig, over: Partial<IngestionConfig>): IngestionConfig {
  return {
    ...base,
    ...over,
    sources: { ...base.sources, ...over.sources },
    selectors: { ...base.selectors, ...over.selectors },
    assets: { ...base.assets, ...over.assets },
  };
}

/** True when no source URLs and no asset URLs are configured at all. */
export function isEmptyConfig(cfg: IngestionConfig): boolean {
  const sources = Object.values(cfg.sources).some((arr) => arr.length > 0);
  const assets = Object.values(cfg.assets).some((arr) => arr.length > 0);
  return !sources && !assets;
}
