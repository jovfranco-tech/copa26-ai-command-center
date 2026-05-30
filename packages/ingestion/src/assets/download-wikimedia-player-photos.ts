/**
 * Resolve player photos from Wikidata P18 / Wikimedia Commons, then download
 * them with the same local-only asset pipeline used by configured URLs.
 *
 * Run:
 *   pnpm ingest:player-photos:wikimedia
 *
 * Useful filters:
 *   PLAYER_PHOTO_TEAM=MEX
 *   PLAYER_PHOTO_LIMIT=10
 *   PLAYER_PHOTO_DOWNLOAD_LIMIT=8
 *   PLAYER_PHOTO_RESOLVE_ONLY=1
 *   PLAYER_PHOTO_FORCE_RESOLVE=1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { dbFileExists, getClient, getDb, schema } from '@worldcup/db';
import { mock, type Player } from '@worldcup/shared';
import { loadConfig } from '../config.js';
import { downloadAsset, type DownloadedAsset } from '../lib/asset-downloader.js';
import { CACHE_DIR, writeJsonCache } from '../lib/cache.js';
import { dbReady, recordSyncRun, registerAssets } from '../lib/db-writer.js';
import { StopError } from '../lib/errors.js';
import { preflight } from '../lib/guards.js';
import { makeLogger } from '../lib/logger.js';
import { Report } from '../lib/reporter.js';
import { RobotsChecker } from '../lib/robots.js';

const FOOTBALLER_QID = 'Q937857';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const RESOLUTION_CACHE_FILE = join(CACHE_DIR, 'json', 'player-photo-resolutions.json');
const DEFAULT_API_DELAY_MS = 1500;
const API_DELAY_MS = Math.max(
  1000,
  Number(process.env.PLAYER_PHOTO_API_DELAY_MS ?? DEFAULT_API_DELAY_MS),
);
const API_USER_AGENT =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal local research; Wikimedia photo resolver)';

interface PlayerTarget {
  id: string;
  name: string;
  team: string;
  teamName: string;
  club: string;
  photoAssetId: string | null;
}

interface WikidataSearchHit {
  id: string;
  label?: string;
  description?: string;
}

interface WikidataSearchResponse {
  search?: WikidataSearchHit[];
}

interface WikidataClaim {
  mainsnak?: {
    datavalue?: {
      value?: string | { id?: string };
    };
  };
}

interface WikidataEntity {
  id: string;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, WikidataClaim[]>;
}

interface WikidataEntitiesResponse {
  entities?: Record<string, WikidataEntity>;
}

interface CommonsImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          url?: string;
          descriptionurl?: string;
          mime?: string;
        }>;
      }
    >;
  };
}

interface WikipediaSummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  originalimage?: {
    source?: string;
  };
  thumbnail?: {
    source?: string;
  };
}

interface PhotoResolution {
  playerId: string;
  name: string;
  team: string;
  status: 'resolved' | 'missing' | 'error';
  qid?: string;
  label?: string;
  description?: string;
  score?: number;
  filename?: string;
  sourceUrl?: string;
  pageUrl?: string;
  mimeType?: string;
  reason?: string;
  resolvedAt: string;
}

interface Candidate {
  entity: WikidataEntity;
  label: string;
  description: string;
  filename: string;
  score: number;
}

let lastApiRequestAt = 0;

async function main(): Promise<void> {
  const log = makeLogger('assets:wikimedia-players');
  const cfg = await loadConfig();
  preflight(log);

  const players = await loadPlayers();
  const selected = filterPlayers(players);
  const cache = readResolutionCache();
  const report = new Report('Asset download - Wikimedia player photos');
  const robots = new RobotsChecker(cfg.userAgent, log);
  const downloaded: DownloadedAsset[] = [];
  const errors: string[] = [];
  const missing: PhotoResolution[] = [];
  const resolved: PhotoResolution[] = [];
  const downloadLimit = Number(process.env.PLAYER_PHOTO_DOWNLOAD_LIMIT ?? 0);
  let stopped: string | null = null;

  report
    .h('Source')
    .bullet('Wikipedia page image first; Wikidata item image (P18) fallback, resolved through Wikimedia Commons.')
    .bullet('Downloads still go through the local-only asset pipeline and private-assets/players.');

  report
    .h('Selection')
    .kv('Players in dataset', players.length)
    .kv('Players considered', selected.length)
    .kv('Team filter', process.env.PLAYER_PHOTO_TEAM?.toUpperCase() || 'all')
    .kv('Limit', process.env.PLAYER_PHOTO_LIMIT || 'none')
    .kv('Download limit', process.env.PLAYER_PHOTO_DOWNLOAD_LIMIT || 'none')
    .kv('Resolve only', process.env.PLAYER_PHOTO_RESOLVE_ONLY === '1' ? 'yes' : 'no');

  for (const player of selected) {
    const resolution = await resolvePlayerPhoto(player, cache, log);
    cache[player.id] = resolution;
    writeResolutionCache(cache);

    if (resolution.status === 'resolved') {
      resolved.push(resolution);
      log.info(`resolved -> ${player.id} ${player.name} (${resolution.filename})`);
      report.bullet(`${player.id} ${player.name} -> ${resolution.filename} (${resolution.label})`);
    } else {
      missing.push(resolution);
      log.warn(`missing -> ${player.id} ${player.name}: ${resolution.reason ?? 'no Wikimedia image found'}`);
      report.bullet(`MISSING ${player.id} ${player.name}: ${resolution.reason ?? 'no Wikimedia image found'}`);
    }
  }

  writeJsonCache('player-photo-resolutions', Object.values(cache));

  if (process.env.PLAYER_PHOTO_RESOLVE_ONLY !== '1') {
    const toDownload =
      Number.isFinite(downloadLimit) && downloadLimit > 0 ? resolved.slice(0, downloadLimit) : resolved;
    for (const r of toDownload) {
      if (!r.sourceUrl) continue;
      try {
        const asset = await downloadAsset(
          { entityType: 'player', entityId: r.playerId, assetType: 'photo', url: r.sourceUrl },
          cfg,
          robots,
          log,
        );
        downloaded.push(asset);
      } catch (err) {
        if (err instanceof StopError) {
          stopped = err.message;
          log.stop(err.message);
          break;
        }
        errors.push(`${r.playerId} (${r.sourceUrl}): ${(err as Error).message}`);
      }
    }
  }

  let registered = 0;
  if (downloaded.length && dbReady()) {
    registered = await registerAssets(downloaded);
    await recordSyncRun({
      status: stopped ? 'stopped' : 'ok',
      source: 'wikimedia-player-photos',
      recordsCreated: 0,
      recordsUpdated: 0,
      assetsDownloaded: registered,
      errorsCount: errors.length + missing.length + (stopped ? 1 : 0),
    });
  } else if (downloaded.length) {
    log.warn('SQLite not found - photos saved to private-assets/ but not registered. Run `pnpm db:migrate`.');
  }

  report
    .h('Summary')
    .kv('Resolved', resolved.length)
    .kv('Missing', missing.length)
    .kv('Downloaded', downloaded.length)
    .kv('Registered in DB', registered)
    .kv('Errors', errors.length)
    .kv('Stopped', stopped ? 'yes' : 'no');

  if (missing.length) {
    report.h('Missing players');
    for (const r of missing) report.bullet(`${r.playerId} ${r.name}: ${r.reason ?? 'no image found'}`);
  }

  if (errors.length) {
    report.h('Errors');
    for (const err of errors) report.bullet(err);
  }

  if (stopped) report.h('Stopped per policy').bullet(stopped);

  const reportPath = report.write('player-photo-download-report.md');
  log.info(
    `done. resolved=${resolved.length} downloaded=${downloaded.length} registered=${registered} report=${reportPath}`,
  );

  if (dbFileExists()) getClient().close();
  if (stopped) process.exitCode = 1;
}

async function loadPlayers(): Promise<PlayerTarget[]> {
  if (dbFileExists()) {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.players.fifaId,
        name: schema.players.name,
        team: schema.teams.countryCode,
        teamName: schema.teams.name,
        club: schema.players.club,
        photoAssetId: schema.players.photoAssetId,
      })
      .from(schema.players)
      .leftJoin(schema.teams, eq(schema.players.teamId, schema.teams.id))
      .orderBy(asc(schema.players.fifaId));

    return rows
      .filter((row): row is typeof row & { id: string; team: string; teamName: string } => Boolean(row.id && row.team))
      .map((row) => ({
        id: row.id,
        name: row.name,
        team: row.team,
        teamName: row.teamName,
        club: row.club ?? '',
        photoAssetId: row.photoAssetId ?? null,
      }));
  }

  return mock.PLAYERS.map((p: Player) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    teamName: mock.teamByCode[p.team]?.name ?? p.team,
    club: p.club,
    photoAssetId: p.photoAssetId,
  }));
}

function filterPlayers(players: PlayerTarget[]): PlayerTarget[] {
  const team = process.env.PLAYER_PHOTO_TEAM?.trim().toUpperCase();
  const includeExisting = process.env.PLAYER_PHOTO_INCLUDE_EXISTING === '1';
  const limit = Number(process.env.PLAYER_PHOTO_LIMIT ?? 0);
  let selected = players;
  if (team) selected = selected.filter((p) => p.team === team);
  if (!includeExisting) selected = selected.filter((p) => !p.photoAssetId);
  if (Number.isFinite(limit) && limit > 0) selected = selected.slice(0, limit);
  return selected;
}

async function resolvePlayerPhoto(
  player: PlayerTarget,
  cache: Record<string, PhotoResolution>,
  log: ReturnType<typeof makeLogger>,
): Promise<PhotoResolution> {
  const cached = cache[player.id];
  if (cached && process.env.PLAYER_PHOTO_FORCE_RESOLVE !== '1') {
    log.info(`resolution cache hit -> ${player.id} ${player.name}`);
    return cached;
  }

  try {
    const wikipediaResolution = await resolveFromWikipediaSummary(player);
    if (wikipediaResolution) return wikipediaResolution;

    const candidates = new Map<string, WikidataEntity>();
    let best: Candidate | null = null;

    for (const term of searchTerms(player)) {
      const hits = await searchEntities(term);
      const ids = hits.map((hit) => hit.id).filter((id) => !candidates.has(id));
      const entities = ids.length ? await fetchEntities(ids) : [];
      for (const entity of entities) candidates.set(entity.id, entity);

      best = chooseBestCandidate(player, [...candidates.values()]);
      if (best && best.score >= 120) break;
    }

    if (!best) return missingResolution(player, 'no matching footballer with an image');

    const imageInfo = await fetchCommonsImageInfo(best.filename);
    if (!imageInfo?.url) return missingResolution(player, `Commons image URL not found for ${best.filename}`);

    return {
      playerId: player.id,
      name: player.name,
      team: player.team,
      status: 'resolved',
      qid: best.entity.id,
      label: best.label,
      description: best.description,
      score: best.score,
      filename: best.filename,
      sourceUrl: imageInfo.url,
      pageUrl: imageInfo.descriptionurl,
      mimeType: imageInfo.mime,
      resolvedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      playerId: player.id,
      name: player.name,
      team: player.team,
      status: 'error',
      reason: (err as Error).message,
      resolvedAt: new Date().toISOString(),
    };
  }
}

async function resolveFromWikipediaSummary(player: PlayerTarget): Promise<PhotoResolution | null> {
  for (const title of wikipediaTitles(player)) {
    const url = new URL(`${WIKIPEDIA_SUMMARY}${encodeURIComponent(title)}`);
    const summary = await fetchJsonOptional<WikipediaSummaryResponse>(url, [404]);
    if (!summary) continue;

    const sourceUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
    if (!sourceUrl) continue;

    const description = [summary.description, summary.extract].filter(Boolean).join(' ');
    if (!/\b(footballer|football player|soccer player|futbolista)\b/i.test(description)) continue;

    const titleName = (summary.title ?? title).replace(/\s+\(.+\)$/, '');
    const titleNorm = normalizeName(titleName);
    const nameNorm = normalizeName(player.name);
    if (titleNorm !== nameNorm && !titleNorm.includes(nameNorm) && !nameNorm.includes(titleNorm)) continue;

    return {
      playerId: player.id,
      name: player.name,
      team: player.team,
      status: 'resolved',
      label: summary.title ?? player.name,
      description: summary.description ?? '',
      score: 140,
      filename: filenameFromUrl(sourceUrl),
      sourceUrl,
      pageUrl: summary.content_urls?.desktop?.page,
      mimeType: mimeFromUrl(sourceUrl),
      resolvedAt: new Date().toISOString(),
    };
  }

  return null;
}

function wikipediaTitles(player: PlayerTarget): string[] {
  const base = player.name.trim().replace(/\s+/g, '_');
  const ascii = stripDiacritics(base);
  return unique([base, `${base}_(footballer)`, ascii !== base ? ascii : '']);
}

function searchTerms(player: PlayerTarget): string[] {
  const base = player.name.trim();
  const ascii = stripDiacritics(base);
  return unique(
    [
      `${base} footballer`,
      base,
      `${base} soccer player`,
      player.teamName ? `${base} ${player.teamName}` : '',
      player.club ? `${base} ${player.club}` : '',
      ascii !== base ? `${ascii} footballer` : '',
      ascii !== base ? ascii : '',
    ].filter(Boolean),
  );
}

async function searchEntities(term: string): Promise<WikidataSearchHit[]> {
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: '5',
    search: term,
  }).toString();
  const json = await fetchJson<WikidataSearchResponse>(url);
  return json.search ?? [];
}

async function fetchEntities(ids: string[]): Promise<WikidataEntity[]> {
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    props: 'claims|labels|descriptions',
    languages: 'en|es',
    ids: ids.join('|'),
  }).toString();
  const json = await fetchJson<WikidataEntitiesResponse>(url);
  return Object.values(json.entities ?? {}).filter((entity) => entity.id && entity.id !== '-1');
}

async function fetchCommonsImageInfo(filename: string): Promise<{
  url?: string;
  descriptionurl?: string;
  mime?: string;
} | null> {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    titles: `File:${filename}`,
  }).toString();
  const json = await fetchJson<CommonsImageInfoResponse>(url);
  const page = Object.values(json.query?.pages ?? {})[0];
  return page?.imageinfo?.[0] ?? null;
}

function chooseBestCandidate(player: PlayerTarget, entities: WikidataEntity[]): Candidate | null {
  const scored = entities
    .map((entity) => scoreCandidate(player, entity))
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score && scored[0].score >= 100 ? scored[0] : null;
}

function scoreCandidate(player: PlayerTarget, entity: WikidataEntity): Candidate | null {
  const filename = stringClaim(entity, 'P18');
  if (!filename) return null;

  const label = labelOf(entity);
  const description = descriptionOf(entity);
  const labelNorm = normalizeName(label);
  const nameNorm = normalizeName(player.name);
  const descNorm = normalizeName(description);
  const hasFootballOccupation = entityClaimIds(entity, 'P106').includes(FOOTBALLER_QID);
  const footballDescription = /\b(footballer|football player|soccer player|futbolista)\b/i.test(description);

  if (!hasFootballOccupation && !footballDescription) return null;

  let score = 0;
  if (labelNorm === nameNorm) score += 100;
  else if (labelNorm.includes(nameNorm) || nameNorm.includes(labelNorm)) score += 45;
  else score -= 40;

  if (hasFootballOccupation) score += 60;
  if (footballDescription) score += 20;
  if (player.club && descNorm.includes(normalizeName(player.club))) score += 10;
  if (player.teamName && descNorm.includes(normalizeName(player.teamName))) score += 10;

  return { entity, label, description, filename, score };
}

async function fetchJson<T>(url: URL): Promise<T> {
  const json = await fetchJsonOptional<T>(url, []);
  if (json == null) throw new Error(`unexpected empty JSON response from ${url.origin}`);
  return json;
}

async function fetchJsonOptional<T>(url: URL, nullStatuses: number[]): Promise<T | null> {
  await waitForApiSlot();

  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    let text: string;
    try {
      res = await fetch(url, {
        headers: { 'user-agent': API_USER_AGENT },
        signal: controller.signal,
      });
      text = await res.text();
    } catch (err) {
      if (attempt === 3) throw new Error(`request failed for ${url.origin}: ${(err as Error).message}`);
      await sleep((attempt + 1) * 5000);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 429 || /too many requests/i.test(text)) {
      const waitMs = (attempt + 1) * 15_000;
      console.warn(`[assets:wikimedia-players] Wikimedia asked us to slow down; retrying in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    if (nullStatuses.includes(res.status)) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 180)}`);
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`invalid JSON from ${url.origin}: ${(err as Error).message}`);
    }
  }

  throw new Error(`Wikimedia API rate-limited after retries: ${url.origin}`);
}

async function waitForApiSlot(): Promise<void> {
  const elapsed = Date.now() - lastApiRequestAt;
  if (elapsed < API_DELAY_MS) await sleep(API_DELAY_MS - elapsed);
  lastApiRequestAt = Date.now();
}

function readResolutionCache(): Record<string, PhotoResolution> {
  if (!existsSync(RESOLUTION_CACHE_FILE)) return {};
  try {
    const raw = JSON.parse(readFileSync(RESOLUTION_CACHE_FILE, 'utf8')) as unknown;
    if (!Array.isArray(raw)) return {};
    return Object.fromEntries(
      raw
        .filter((item): item is PhotoResolution => Boolean(item && typeof item === 'object' && 'playerId' in item))
        .map((item) => [item.playerId, item]),
    );
  } catch {
    return {};
  }
}

function writeResolutionCache(cache: Record<string, PhotoResolution>): void {
  const dir = join(CACHE_DIR, 'json');
  mkdirSync(dir, { recursive: true });
  writeFileSync(RESOLUTION_CACHE_FILE, JSON.stringify(Object.values(cache), null, 2), 'utf8');
}

function missingResolution(player: PlayerTarget, reason: string): PhotoResolution {
  return {
    playerId: player.id,
    name: player.name,
    team: player.team,
    status: 'missing',
    reason,
    resolvedAt: new Date().toISOString(),
  };
}

function entityClaimIds(entity: WikidataEntity, prop: string): string[] {
  return (entity.claims?.[prop] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .map((value) => (typeof value === 'object' && value ? value.id : null))
    .filter((id): id is string => Boolean(id));
}

function stringClaim(entity: WikidataEntity, prop: string): string | null {
  const value = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === 'string' ? value : null;
}

function labelOf(entity: WikidataEntity): string {
  return entity.labels?.en?.value ?? entity.labels?.es?.value ?? entity.id;
}

function descriptionOf(entity: WikidataEntity): string {
  return entity.descriptions?.en?.value ?? entity.descriptions?.es?.value ?? '';
}

function normalizeName(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function filenameFromUrl(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return decodeURIComponent(pathname.split('/').pop() || 'photo.jpg');
  } catch {
    return 'photo.jpg';
  }
}

function mimeFromUrl(value: string): string | undefined {
  const ext = filenameFromUrl(value).toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return undefined;
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('[assets:wikimedia-players] fatal:', err);
  process.exit(1);
});
