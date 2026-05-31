import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datasetFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'worldcup2026.json');
const cacheFile = join(repoRoot, 'scraped-cache', 'json', 'team-kit-resolutions.json');
const privateKitsDir = join(repoRoot, 'private-assets', 'kits');
const staticKitsDir = join(repoRoot, 'apps', 'web', 'static', 'team-kits');
const generatedFile = join(repoRoot, 'apps', 'web', 'src', 'generated', 'teamKits.ts');
const downloadEnabled = process.env.TEAM_KIT_DOWNLOAD === '1';
const downloadDir = process.env.TEAM_KIT_DOWNLOAD_STATIC === '1' ? staticKitsDir : privateKitsDir;
const downloadLimit = Number(process.env.TEAM_KIT_DOWNLOAD_LIMIT ?? 0);
const minDelayMs = Math.max(1000, Number(process.env.TEAM_KIT_MIN_DELAY_MS ?? 2500));
const maxDelayMs = Math.max(minDelayMs, Number(process.env.TEAM_KIT_MAX_DELAY_MS ?? 6000));
const userAgent =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal local research; Wikimedia kit resolver)';
const KIT_VARIANTS = [
  { id: 'home', slot: '1', fallbackColor: 'colorA' },
  { id: 'away', slot: '2', fallbackColor: 'colorB' },
  { id: 'third', slot: '3', fallbackColor: 'colorA' },
];

const TEAM_PAGES = {
  ALG: 'Algeria national football team',
  ARG: 'Argentina national football team',
  AUS: "Australia men's national soccer team",
  AUT: 'Austria national football team',
  BEL: 'Belgium national football team',
  BIH: 'Bosnia and Herzegovina national football team',
  BRA: 'Brazil national football team',
  CAN: "Canada men's national soccer team",
  CIV: 'Ivory Coast national football team',
  COD: 'DR Congo national football team',
  COL: 'Colombia national football team',
  CPV: 'Cape Verde national football team',
  CRO: 'Croatia national football team',
  CUW: 'Curaçao national football team',
  CZE: 'Czech Republic national football team',
  ECU: 'Ecuador national football team',
  EGY: 'Egypt national football team',
  ENG: 'England national football team',
  ESP: 'Spain national football team',
  FRA: 'France national football team',
  GER: 'Germany national football team',
  GHA: 'Ghana national football team',
  HAI: 'Haiti national football team',
  IRN: 'Iran national football team',
  IRQ: 'Iraq national football team',
  JOR: 'Jordan national football team',
  JPN: 'Japan national football team',
  KOR: 'South Korea national football team',
  KSA: 'Saudi Arabia national football team',
  MAR: 'Morocco national football team',
  MEX: 'Mexico national football team',
  NED: 'Netherlands national football team',
  NOR: 'Norway national football team',
  NZL: 'New Zealand national football team',
  PAN: 'Panama national football team',
  PAR: 'Paraguay national football team',
  POR: 'Portugal national football team',
  QAT: 'Qatar national football team',
  RSA: 'South Africa national soccer team',
  SCO: 'Scotland national football team',
  SEN: 'Senegal national football team',
  SUI: 'Switzerland national football team',
  SWE: 'Sweden national football team',
  TUN: 'Tunisia national football team',
  TUR: 'Turkey national football team',
  URU: 'Uruguay national football team',
  USA: "United States men's national soccer team",
  UZB: 'Uzbekistan national football team',
};

const teams = JSON.parse(readFileSync(datasetFile, 'utf8')).teams;
const cached = readCache();
let resolutions = cached.length ? cached : await resolveTeamKits();

if (downloadEnabled) {
  await downloadTeamKits(resolutions);
}

writeGeneratedFile(resolutions);
writeFileSync(cacheFile, `${JSON.stringify(resolutions, null, 2)}\n`);

console.log(
  `[generate-team-kits] wrote ${resolutions.filter((r) => r.status === 'resolved').length} kit fallbacks and ${countDownloadedKitVariants()} local kit variant entries.`,
);

function readCache() {
  if (!existsSync(cacheFile) || process.env.TEAM_KIT_FORCE_RESOLVE === '1') return [];
  const raw = JSON.parse(readFileSync(cacheFile, 'utf8'));
  return Array.isArray(raw) ? raw : [];
}

async function resolveTeamKits() {
  mkdirSync(dirname(cacheFile), { recursive: true });
  const titles = teams.map((team) => TEAM_PAGES[team.code]).filter(Boolean);
  const pageByTitle = await fetchWikipediaPages(titles);
  const initial = teams.map((team) => {
    const requestedTitle = TEAM_PAGES[team.code];
    const page = requestedTitle ? pageByTitle.get(requestedTitle) : null;
    const fields = parseKitFields(page?.content ?? '');
    const variants = Object.fromEntries(
      KIT_VARIANTS.map((variant) => {
        const patternBody = normalizePattern(fields[`pattern_b${variant.slot}`]);
        const bodyColor = normalizeColor(fields[`body${variant.slot}`], team[variant.fallbackColor] ?? team.colorA);
        return [
          variant.id,
          {
            variant: variant.id,
            status: patternBody ? 'resolved' : 'missing',
            patternBody,
            bodyColor,
            fileTitle: patternBody ? `File:Kit body ${patternBody}.png` : null,
            sourceUrl: null,
            sourcePage: null,
            mimeType: null,
          },
        ];
      }),
    );
    const home = variants.home;
    return {
      teamId: team.code,
      teamName: team.name,
      pageTitle: page?.title ?? requestedTitle ?? null,
      pageUrl: page?.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` : null,
      status: home.status,
      patternBody: home.patternBody,
      bodyColor: home.bodyColor,
      fileTitle: home.fileTitle,
      sourceUrl: null,
      sourcePage: null,
      mimeType: null,
      variants,
      resolvedAt: new Date().toISOString(),
    };
  });

  const imageMap = await resolveCommonsImages(
    initial.flatMap((item) => Object.values(item.variants).map((variant) => variant.fileTitle).filter((title) => title)),
  );

  return initial.map((item) => {
    const variants = Object.fromEntries(
      Object.entries(item.variants).map(([variantId, variant]) => {
        if (!variant.fileTitle) return [variantId, variant];
        const image = imageMap.get(variant.fileTitle);
        if (!image?.url) return [variantId, { ...variant, status: 'missing' }];
        const filename = variant.fileTitle.replace(/^File:/, '');
        return [
          variantId,
          {
            ...variant,
            status: 'resolved',
            sourceUrl: commonsFilePath(filename, 256),
            sourcePage: image.descriptionurl ?? null,
            mimeType: image.mime ?? null,
          },
        ];
      }),
    );
    const home = variants.home;
    return {
      ...item,
      status: home?.status ?? 'missing',
      sourceUrl: home?.sourceUrl ?? null,
      sourcePage: home?.sourcePage ?? null,
      mimeType: home?.mimeType ?? null,
      variants,
    };
  });
}

async function fetchWikipediaPages(titles) {
  const pageByRequestedTitle = new Map();
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    redirects: '1',
    titles: titles.join('|'),
  });
  const json = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const normalized = new Map((json.query?.normalized ?? []).map((item) => [item.from, item.to]));
  const redirects = new Map((json.query?.redirects ?? []).map((item) => [item.from, item.to]));
  const pages = new Map();
  for (const page of json.query?.pages ?? []) {
    pages.set(page.title, {
      title: page.title,
      content: page.revisions?.[0]?.slots?.main?.content ?? '',
    });
  }
  for (const title of titles) {
    const normalizedTitle = normalized.get(title) ?? title;
    const finalTitle = redirects.get(normalizedTitle) ?? normalizedTitle;
    pageByRequestedTitle.set(title, pages.get(finalTitle) ?? null);
  }
  return pageByRequestedTitle;
}

async function resolveCommonsImages(titles) {
  const imageByRequestedTitle = new Map();
  for (const chunk of chunks([...new Set(titles)], 45)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      redirects: '1',
      titles: chunk.join('|'),
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const normalized = new Map((json.query?.normalized ?? []).map((item) => [item.from, item.to]));
    const redirects = new Map((json.query?.redirects ?? []).map((item) => [item.from, item.to]));
    const pages = new Map((json.query?.pages ?? []).map((page) => [page.title, page]));
    for (const title of chunk) {
      const normalizedTitle = normalized.get(title) ?? title;
      const finalTitle = redirects.get(normalizedTitle) ?? normalizedTitle;
      imageByRequestedTitle.set(title, pages.get(finalTitle)?.imageinfo?.[0] ?? null);
    }
    await sleep(750);
  }
  return imageByRequestedTitle;
}

function parseKitFields(wikitext) {
  const fields = {};
  for (const line of wikitext.split('\n')) {
    const match = line.match(/^\|\s*([a-z_]+[1-9])\s*=\s*(.*?)\s*$/i);
    if (!match) continue;
    fields[match[1].toLowerCase()] = cleanWikiValue(match[2]);
  }
  return fields;
}

function cleanWikiValue(value = '') {
  return value
    .replace(/<!--.*?-->/g, '')
    .replace(/<ref\b[^>]*>.*?<\/ref>/gi, '')
    .replace(/<ref\b[^/]*\/>/gi, '')
    .trim();
}

function normalizePattern(value) {
  const cleaned = cleanWikiValue(value);
  if (!cleaned || /^none$/i.test(cleaned) || /^_?blank$/i.test(cleaned)) return null;
  return cleaned;
}

function normalizeColor(value, fallback) {
  const cleaned = cleanWikiValue(value).replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned) || /^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  return fallback ?? '#2a3550';
}

async function downloadTeamKits(items) {
  mkdirSync(downloadDir, { recursive: true });
  const resolved = items.flatMap((item) =>
    Object.values(item.variants ?? {})
      .filter((variant) => variant.status === 'resolved' && variant.sourceUrl)
      .map((variant) => ({ ...variant, teamId: item.teamId })),
  );
  const selected = Number.isFinite(downloadLimit) && downloadLimit > 0 ? resolved.slice(0, downloadLimit) : resolved;
  let downloaded = 0;
  for (const item of selected) {
    const ext = extname(new URL(item.sourceUrl).pathname).slice(1).toLowerCase() || 'png';
    const basename = item.variant === 'home' ? item.teamId : `${item.teamId}-${item.variant}`;
    const target = join(downloadDir, `${basename}.${ext}`);
    if (existsSync(target) && process.env.TEAM_KIT_FORCE_DOWNLOAD !== '1') continue;
    await politeDelay();
    const res = await fetchWithRetry(item.sourceUrl, `kit:${item.teamId}:${item.variant}`);
    if (!res.ok) throw new Error(`Kit download failed for ${item.teamId}: HTTP ${res.status}`);
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    downloaded++;
    console.log(`[generate-team-kits] downloaded ${item.teamId}:${item.variant} -> ${target.replace(`${repoRoot}/`, '')}`);
  }
  console.log(`[generate-team-kits] downloaded ${downloaded} kit image${downloaded === 1 ? '' : 's'}.`);
}

function readDownloadedKitExts() {
  const entries = {};
  for (const dir of [privateKitsDir, staticKitsDir]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const ext = extname(file).slice(1).toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) continue;
      const code = file.slice(0, -ext.length - 1);
      if (/^[A-Z]{3}$/.test(code)) entries[code] = ext;
    }
  }
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

function readDownloadedKitVariantExts() {
  const variants = {};
  for (const dir of [privateKitsDir, staticKitsDir]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const ext = extname(file).slice(1).toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) continue;
      const id = file.slice(0, -ext.length - 1);
      const match = id.match(/^([A-Z]{3})-(home|away|third|gk)$/);
      if (match) {
        variants[match[1]] = { ...(variants[match[1]] ?? {}), [match[2]]: ext };
        continue;
      }
      if (/^[A-Z]{3}$/.test(id)) {
        variants[id] = { ...(variants[id] ?? {}), home: ext };
      }
    }
  }
  return Object.fromEntries(Object.entries(variants).sort(([a], [b]) => a.localeCompare(b)));
}

function countDownloadedKitVariants() {
  return Object.values(readDownloadedKitVariantExts()).reduce((sum, variants) => sum + Object.keys(variants).length, 0);
}

function writeGeneratedFile(items) {
  mkdirSync(dirname(generatedFile), { recursive: true });
  const downloadedTeamKitExts = readDownloadedKitExts();
  const downloadedTeamKitVariantExts = readDownloadedKitVariantExts();
  const teamKitVariants = Object.fromEntries(
    items
      .map((item) => [
        item.teamId,
        Object.fromEntries(
          Object.entries(item.variants ?? {})
            .filter(([, variant]) => variant.status === 'resolved' && variant.sourceUrl)
            .map(([variantId, variant]) => [
              variantId,
              {
                src: variant.sourceUrl,
                page: variant.sourcePage ?? item.pageUrl ?? undefined,
                bodyColor: variant.bodyColor,
              },
            ]),
        ),
      ])
      .filter(([, variants]) => Object.keys(variants).length > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const teamKitFallbacks = Object.fromEntries(
    items
      .filter((item) => item.status === 'resolved' && item.sourceUrl)
      .map((item) => [
        item.teamId,
        {
          src: item.sourceUrl,
          page: item.sourcePage ?? item.pageUrl ?? undefined,
          bodyColor: item.bodyColor,
        },
      ])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const file = `// Generated by scripts/generate-team-kits.mjs. Do not edit manually.
export type TeamKitExt = 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg';
export type TeamKitVariant = 'home' | 'away' | 'third' | 'gk';

export interface TeamKitFallback {
  src: string;
  page?: string;
  bodyColor?: string;
}

export const downloadedTeamKitExts: Record<string, TeamKitExt> = ${JSON.stringify(downloadedTeamKitExts, null, 2)};

export const downloadedTeamKitVariantExts: Record<string, Partial<Record<TeamKitVariant, TeamKitExt>>> = ${JSON.stringify(downloadedTeamKitVariantExts, null, 2)};

export const teamKitFallbacks: Record<string, TeamKitFallback> = ${JSON.stringify(teamKitFallbacks, null, 2)};

export const teamKitVariants: Record<string, Partial<Record<TeamKitVariant, TeamKitFallback>>> = ${JSON.stringify(teamKitVariants, null, 2)};
`;
  writeFileSync(generatedFile, file);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).origin}`);
  return res.json();
}

async function fetchWithRetry(url, label) {
  let res = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { headers: { 'user-agent': userAgent } });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      if (retryAfter >= 120) throw new Error(`Wikimedia rate-limited ${label}; retry after ${retryAfter}s.`);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 10_000;
      console.warn(`[generate-team-kits] HTTP ${res.status} for ${label}; retrying in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    return res;
  }
  return res;
}

function chunks(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function commonsFilePath(filename, width) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

async function politeDelay() {
  const span = maxDelayMs - minDelayMs;
  const delay = minDelayMs + Math.floor(Math.random() * (span + 1));
  await sleep(delay);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
