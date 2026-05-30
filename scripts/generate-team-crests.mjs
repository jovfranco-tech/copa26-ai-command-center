import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datasetFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'worldcup2026.json');
const cacheFile = join(repoRoot, 'scraped-cache', 'json', 'team-crest-resolutions.json');
const privateCrestsDir = join(repoRoot, 'private-assets', 'team-crests');
const staticCrestsDir = join(repoRoot, 'apps', 'web', 'static', 'team-crests');
const generatedFile = join(repoRoot, 'apps', 'web', 'src', 'generated', 'teamCrests.ts');
const downloadEnabled = process.env.TEAM_CREST_DOWNLOAD === '1';
const forceResolve = process.env.TEAM_CREST_FORCE_RESOLVE === '1';
const forceDownload = process.env.TEAM_CREST_FORCE_DOWNLOAD === '1';
const minDelayMs = Math.max(1000, Number(process.env.TEAM_CREST_MIN_DELAY_MS ?? 2500));
const maxDelayMs = Math.max(minDelayMs, Number(process.env.TEAM_CREST_MAX_DELAY_MS ?? 6500));
const userAgent =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal local research; Wikimedia crest resolver)';

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
  NZL: "New Zealand men's national football team",
  PAN: 'Panama national football team',
  PAR: 'Paraguay national football team',
  POR: 'Portugal national football team',
  QAT: 'Qatar national football team',
  RSA: 'South Africa national soccer team',
  SCO: 'Scotland national football team',
  SEN: 'Senegal national football team',
  SUI: 'Switzerland national football team',
  SWE: "Sweden men's national football team",
  TUN: 'Tunisia national football team',
  TUR: 'Turkey national football team',
  URU: 'Uruguay national football team',
  USA: "United States men's national soccer team",
  UZB: 'Uzbekistan national football team',
};

const teams = JSON.parse(readFileSync(datasetFile, 'utf8')).teams;
let resolutions = readCache();
if (!resolutions.length || forceResolve) resolutions = await resolveTeamCrests();

if (downloadEnabled) await downloadTeamCrests(resolutions);

writeGeneratedFile(resolutions);
writeFileSync(cacheFile, `${JSON.stringify(resolutions, null, 2)}\n`);

console.log(
  `[generate-team-crests] wrote ${resolutions.filter((r) => r.status === 'resolved').length} crest fallbacks and ${Object.keys(readDownloadedCrestExts()).length} local crest entries.`,
);

function readCache() {
  if (!existsSync(cacheFile)) return [];
  const raw = JSON.parse(readFileSync(cacheFile, 'utf8'));
  return Array.isArray(raw) ? raw : [];
}

async function resolveTeamCrests() {
  mkdirSync(dirname(cacheFile), { recursive: true });
  const titles = teams.map((team) => TEAM_PAGES[team.code]).filter(Boolean);
  const pageByTitle = await fetchWikipediaPages(titles);
  const parsed = teams.map((team) => {
    const requestedTitle = TEAM_PAGES[team.code];
    const page = requestedTitle ? pageByTitle.get(requestedTitle) : null;
    const badge = page ? parseImageField(page.content, ['Badge']) : null;
    const associationTitle = page ? parseLinkedPageField(page.content, ['Association']) : null;
    return { team, requestedTitle, page, badge, associationTitle };
  });
  const associationTitles = [
    ...new Set(
      parsed
        .filter((entry) => !entry.badge || isFlagFile(entry.badge))
        .map((entry) => entry.associationTitle)
        .filter(Boolean),
    ),
  ];
  const associationByTitle = associationTitles.length ? await fetchWikipediaPages(associationTitles) : new Map();

  const initial = parsed.map(({ team, requestedTitle, page, badge, associationTitle }) => {
    const associationPage = associationTitle ? associationByTitle.get(associationTitle) : null;
    const associationLogo = associationPage ? parseImageField(associationPage.content, ['Logo', 'Badge']) : null;
    const selectedBadge = badge && !isFlagFile(badge) ? badge : associationLogo ?? badge;
    const selectedPage = selectedBadge === associationLogo && associationPage ? associationPage : page;
    return {
      teamId: team.code,
      teamName: team.name,
      pageTitle: selectedPage?.title ?? page?.title ?? requestedTitle ?? null,
      pageUrl: selectedPage?.title
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(selectedPage.title.replaceAll(' ', '_'))}`
        : null,
      status: selectedBadge ? 'resolved' : 'missing',
      fileTitle: selectedBadge ? `File:${selectedBadge}` : null,
      sourceUrl: null,
      sourcePage: null,
      mimeType: null,
      resolvedAt: new Date().toISOString(),
    };
  });

  const imageMap = await resolveWikipediaImages(
    initial.map((item) => item.fileTitle).filter((title) => title),
  );
  return initial.map((item) => {
    if (!item.fileTitle) return item;
    const image = imageMap.get(item.fileTitle);
    if (!image?.url) return { ...item, status: 'missing' };
    return {
      ...item,
      status: 'resolved',
      sourceUrl: image.url,
      sourcePage: image.descriptionurl ?? item.pageUrl ?? null,
      mimeType: image.mime ?? null,
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

async function resolveWikipediaImages(titles) {
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
    const json = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
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

function parseImageField(wikitext, fieldNames) {
  const fieldPattern = fieldNames.map(escapeRegExp).join('|');
  const re = new RegExp(`^\\|\\s*(?:${fieldPattern})\\s*=\\s*(.*?)\\s*$`, 'i');
  for (const line of wikitext.split('\n')) {
    const match = line.match(re);
    if (!match) continue;
    const cleaned = cleanWikiValue(match[1]);
    if (!cleaned) return null;
    const fileMatch = cleaned.match(/\[\[\s*(?:File|Image):([^|\]]+)/i);
    return (fileMatch ? fileMatch[1] : cleaned.replace(/^File:/i, '')).trim();
  }
  return null;
}

function parseLinkedPageField(wikitext, fieldNames) {
  const fieldPattern = fieldNames.map(escapeRegExp).join('|');
  const re = new RegExp(`^\\|\\s*(?:${fieldPattern})\\s*=\\s*(.*?)\\s*$`, 'i');
  for (const line of wikitext.split('\n')) {
    const match = line.match(re);
    if (!match) continue;
    const cleaned = cleanWikiValue(match[1]);
    const link = cleaned.match(/\[\[\s*([^|\]#]+)/);
    return (link ? link[1] : cleaned).trim() || null;
  }
  return null;
}

function isFlagFile(fileName) {
  return /(?:^|\/)flag[_ ]of[_ ]/i.test(fileName);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanWikiValue(value = '') {
  return value
    .replace(/<!--.*?-->/g, '')
    .replace(/<ref\b[^>]*>.*?<\/ref>/gi, '')
    .replace(/<ref\b[^/]*\/>/gi, '')
    .replace(/\{\{.*?\}\}/g, '')
    .trim();
}

async function downloadTeamCrests(items) {
  mkdirSync(privateCrestsDir, { recursive: true });
  let downloaded = 0;
  for (const item of items.filter((entry) => entry.status === 'resolved' && entry.sourceUrl)) {
    const ext = inferExt(item.sourceUrl, item.mimeType);
    const target = join(privateCrestsDir, `${item.teamId}.${ext}`);
    if (existsSync(target) && !forceDownload) continue;
    await politeDelay();
    const res = await fetchWithRetry(item.sourceUrl, item.teamId);
    if (!res) continue;
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    downloaded++;
    console.log(`[generate-team-crests] downloaded ${item.teamId} -> private-assets/team-crests/${basename(target)}`);
  }
  console.log(`[generate-team-crests] downloaded ${downloaded} crest image${downloaded === 1 ? '' : 's'}.`);
}

async function fetchWithRetry(url, teamId) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': userAgent } });
    if (res.ok) return res;
    if (res.status !== 429 || attempt === maxAttempts) {
      console.warn(`[generate-team-crests] skipped ${teamId}: HTTP ${res.status}.`);
      return null;
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter)
      ? Math.max(retryAfter * 1000, 5000)
      : 7500 + attempt * 5000;
    console.warn(`[generate-team-crests] rate-limited at ${teamId}; waiting ${Math.round(waitMs / 1000)}s.`);
    await sleep(waitMs);
  }
  return null;
}

function inferExt(url, mimeType) {
  const ext = extname(new URL(url).pathname).slice(1).toLowerCase();
  if (['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ext;
  if (mimeType === 'image/svg+xml') return 'svg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function readDownloadedCrestExts() {
  const entries = {};
  for (const dir of [privateCrestsDir, staticCrestsDir]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const ext = extname(file).slice(1).toLowerCase();
      if (!['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) continue;
      const code = file.slice(0, -ext.length - 1);
      if (code) entries[code] = ext;
    }
  }
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

function writeGeneratedFile(items) {
  mkdirSync(dirname(generatedFile), { recursive: true });
  const downloadedTeamCrestExts = readDownloadedCrestExts();
  const teamCrestFallbacks = Object.fromEntries(
    items
      .filter((item) => item.status === 'resolved' && item.sourceUrl)
      .map((item) => [item.teamId, { src: item.sourceUrl, page: item.sourcePage ?? item.pageUrl ?? undefined }])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const file = `// Generated by scripts/generate-team-crests.mjs. Do not edit manually.
export type TeamCrestExt = 'svg' | 'png' | 'jpg' | 'jpeg' | 'webp';

export interface TeamCrestFallback {
  src: string;
  page?: string;
}

export const downloadedTeamCrestExts: Record<string, TeamCrestExt> = ${JSON.stringify(downloadedTeamCrestExts, null, 2)};

export const teamCrestFallbacks: Record<string, TeamCrestFallback> = ${JSON.stringify(teamCrestFallbacks, null, 2)};
`;
  writeFileSync(generatedFile, file);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': userAgent } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).origin}`);
  return res.json();
}

function chunks(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function politeDelay() {
  const span = maxDelayMs - minDelayMs;
  const delay = minDelayMs + Math.floor(Math.random() * (span + 1));
  await sleep(delay);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
