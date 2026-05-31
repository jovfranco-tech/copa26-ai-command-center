import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(repoRoot, 'apps', 'web', 'static', 'venue-gallery');
const generatedFile = join(repoRoot, 'apps', 'web', 'src', 'generated', 'venueGallery.ts');
const tempDir = join(repoRoot, '.tmp-intel-packs');
const userAgent =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal private dashboard; Wikimedia venue gallery generator)';
const downloadEnabled = process.env.VENUE_GALLERY_DOWNLOAD !== '0';

const VENUE_PAGES = {
  van: 'BC Place',
  sea: 'Lumen Field',
  sf: "Levi's Stadium",
  lax: 'SoFi Stadium',
  gdl: 'Estadio Akron',
  mex: 'Estadio Azteca',
  mty: 'Estadio BBVA',
  hou: 'NRG Stadium',
  dal: 'AT&T Stadium',
  kc: 'Arrowhead Stadium',
  atl: 'Mercedes-Benz Stadium',
  mia: 'Hard Rock Stadium',
  tor: 'BMO Field',
  bos: 'Gillette Stadium',
  phi: 'Lincoln Financial Field',
  nyc: 'MetLife Stadium',
};

const PRIMARY_FILES = {
  van: 'BC Place Opening Day 2011-09-30.jpg',
  sea: 'Qwest Field North.jpg',
  sf: "Levi's Stadium interior 1.jpg",
  lax: 'SoFi Stadium (51126606022).jpg',
  gdl: 'Estadio Omnilife Chivas.jpg',
  mex: 'Vista aérea del Estadio Azteca - 2026 - 02.jpg',
  mty: 'Mexico Guadalupe Monterrey Estadio BBVA Bancomer fifa world cup 2026 6.JPG',
  hou: 'Reliantstadium.jpg',
  dal: 'Cowboys Stadium 2.jpg',
  kc: 'Arrowhead Stadium 2010.JPG',
  atl: 'Mercedes Benz Stadium time lapse capture 2017-08-13.jpg',
  mia: 'Hard Rock Stadium for Super Bowl LIV (49606707583).jpg',
  tor: 'BMO Field in 2016.png',
  bos: 'Gillette Stadium02.jpg',
  phi: 'Philly (45).JPG',
  nyc: 'New Meadowlands Stadium Mezz Corner.jpg',
};

mkdirSync(outputDir, { recursive: true });
mkdirSync(dirname(generatedFile), { recursive: true });
mkdirSync(tempDir, { recursive: true });

const gallery = {};
let downloaded = 0;

for (const [venueId, pageTitle] of Object.entries(VENUE_PAGES)) {
  const titles = await fetchWikipediaImages(pageTitle);
  const candidates = [PRIMARY_FILES[venueId], ...titles.map((title) => title.replace(/^File:/, ''))]
    .filter(Boolean)
    .filter((filename, index, list) => list.indexOf(filename) === index)
    .filter(isUsableVenueImage)
    .slice(0, 12);
  const imageInfo = await resolveCommonsImages(candidates.map((filename) => `File:${filename}`));
  const selected = candidates
    .map((filename) => ({ filename, image: imageInfo.get(`File:${filename}`) }))
    .filter((entry) => entry.image?.url && entry.image.width >= 500 && entry.image.height >= 320)
    .slice(0, 3);

  gallery[venueId] = [];
  for (const [index, entry] of selected.entries()) {
    const target = join(outputDir, `${venueId}-${index + 1}.webp`);
    if ((!existsSync(target) || process.env.VENUE_GALLERY_FORCE === '1') && downloadEnabled) {
      try {
        await fetchConvert(commonsFilePath(entry.filename, 900), target, `venue-gallery:${venueId}:${index + 1}`);
        downloaded++;
        await sleep(1200);
      } catch (error) {
        console.warn(`[generate-venue-gallery] skipped ${venueId}-${index + 1}: ${error.message}`);
      }
    }
    if (existsSync(target)) {
      gallery[venueId].push({
        src: `/venue-gallery/${venueId}-${index + 1}.webp`,
        page: entry.image.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(entry.filename)}`,
        source: 'Wikimedia Commons',
        filename: entry.filename,
      });
    }
  }
  await sleep(500);
}

writeGeneratedFile(gallery);
console.log(
  `[generate-venue-gallery] downloaded ${downloaded}; gallery=${Object.values(gallery).reduce((sum, items) => sum + items.length, 0)} images.`,
);

async function fetchWikipediaImages(title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'images',
    imlimit: '100',
    redirects: '1',
    titles: title,
  });
  const json = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  return json.query?.pages?.[0]?.images?.map((image) => image.title) ?? [];
}

async function resolveCommonsImages(titles) {
  const images = new Map();
  for (const chunk of chunks(titles, 45)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      titles: chunk.join('|'),
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of json.query?.pages ?? []) {
      if (page.imageinfo?.[0]) images.set(page.title, page.imageinfo[0]);
    }
    await sleep(500);
  }
  return images;
}

function isUsableVenueImage(filename) {
  const lower = filename.toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extname(lower))) return false;
  return ![
    'logo',
    'wordmark',
    'icon',
    'seal',
    'map',
    'location',
    'plan',
    'diagram',
    'seating',
    'site',
    'flag',
    'jersey',
    'kit',
    'poster',
    'emblem',
  ].some((token) => lower.includes(token));
}

async function fetchConvert(url, target, label) {
  const tmp = join(tempDir, `${label.replace(/[^a-z0-9_-]/gi, '_')}${extFromUrl(url)}`);
  const res = await fetchWithRetry(url, label);
  if (!res?.ok) throw new Error(`HTTP ${res?.status ?? 'fetch'} ${res?.statusText ?? 'failed'} for ${label}`);
  const mime = res.headers.get('content-type') ?? '';
  if (!mime.startsWith('image/')) throw new Error(`expected image response for ${label}, got ${mime || 'unknown'}`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const result = spawnSync(
    'magick',
    [tmp, '-auto-orient', '-resize', '900x506^', '-gravity', 'center', '-extent', '900x506', '-strip', '-quality', '78', target],
    { cwd: repoRoot, stdio: 'pipe' },
  );
  if (result.status !== 0) throw new Error(result.stderr.toString('utf8').trim() || `magick exited ${result.status}`);
}

async function fetchJson(url) {
  const res = await fetchWithRetry(url, new URL(url).hostname);
  if (!res?.ok) throw new Error(`HTTP ${res?.status ?? 'fetch'} from ${new URL(url).origin}`);
  return res.json();
}

async function fetchWithRetry(url, label) {
  let res = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { headers: { 'user-agent': userAgent, accept: '*/*' } });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      if (retryAfter >= 120) throw new Error(`rate-limited ${label}; retry-after=${retryAfter}s`);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 10_000;
      console.warn(`[generate-venue-gallery] HTTP ${res.status} for ${label}; retrying in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    return res;
  }
  return res;
}

function writeGeneratedFile(payload) {
  const file = `// Generated by scripts/generate-venue-gallery.mjs. Do not edit manually.
export interface VenueGalleryImage {
  src: string;
  page: string;
  source: string;
  filename: string;
}

export const venueGalleryImages: Record<string, VenueGalleryImage[]> = ${JSON.stringify(payload, null, 2)};
`;
  writeFileSync(generatedFile, file);
}

function commonsFilePath(filename, width) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

function extFromUrl(value) {
  const ext = extname(new URL(value).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.img';
}

function chunks(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
