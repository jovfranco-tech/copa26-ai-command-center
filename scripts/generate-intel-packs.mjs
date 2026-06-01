import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datasetFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'worldcup2026.json');
const stadiumsFile = join(repoRoot, 'packages', 'ingestion', 'vendor', 'tournament-data-2026', 'cup_stadiums.csv');
const playerPhotoCacheFile = join(repoRoot, 'scraped-cache', 'json', 'player-photo-resolutions.json');
const generatedFile = join(repoRoot, 'apps', 'web', 'src', 'generated', 'intelPacks.ts');
const playerPhotoDir = join(repoRoot, 'apps', 'web', 'static', 'player-photos');
const venuePhotoDir = join(repoRoot, 'apps', 'web', 'static', 'venue-photos');
const venueGalleryDir = join(repoRoot, 'apps', 'web', 'static', 'venue-gallery');
const coachPhotoDir = join(repoRoot, 'apps', 'web', 'static', 'coach-photos');
const teamKitDir = join(repoRoot, 'apps', 'web', 'static', 'team-kits');
const brandAssetDir = join(repoRoot, 'apps', 'web', 'static', 'brand');
const tempDir = join(repoRoot, '.tmp-intel-packs');

const userAgent =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal private dashboard; Wikimedia/Open-Meteo data pack generator)';
const fetchDelayMs = Math.max(0, Number(process.env.INTEL_FETCH_DELAY_MS ?? 180));
const playerLimit = Number(process.env.INTEL_PLAYER_PHOTO_LIMIT ?? 0);
const force = process.env.INTEL_FORCE === '1';
const downloadPlayers = force || process.env.INTEL_DOWNLOAD_PLAYERS === '1' || process.env.INTEL_DOWNLOAD_MISSING === '1';
const downloadCoaches = force || process.env.INTEL_DOWNLOAD_COACHES === '1' || process.env.INTEL_DOWNLOAD_MISSING === '1';
const downloadVenues = process.env.INTEL_DOWNLOAD_VENUES !== '0';

const VENUE_PHOTO_FILES = {
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

const dataset = JSON.parse(readFileSync(datasetFile, 'utf8'));
const generatedAt = new Date().toISOString();

mkdirSync(tempDir, { recursive: true });
mkdirSync(playerPhotoDir, { recursive: true });
mkdirSync(venuePhotoDir, { recursive: true });
mkdirSync(coachPhotoDir, { recursive: true });

try {
  const venueExtras = parseVenueExtras();
  const playerPhotoResult = await materializePlayerPhotos();
  const venuePhotoResult = await materializeVenuePhotos();
  const coachProfiles = await resolveCoachProfiles();
  const weather = await buildWeatherBaseline(venueExtras);
  const dataPacks = buildDataPacks(playerPhotoResult, venuePhotoResult, coachProfiles, weather, venueExtras);

  writeGeneratedFile({
    generatedAt,
    venueExtras,
    downloadedVenuePhotoExts: venuePhotoResult.downloadedExts,
    venuePhotoCredits: venuePhotoResult.credits,
    coachProfiles,
    matchWeather: weather.matchWeather,
    weatherMeta: weather.meta,
    dataPacks,
  });

  console.log(
    `[generate-intel-packs] players=${playerPhotoResult.downloaded}/${playerPhotoResult.resolved} venues=${venuePhotoResult.downloaded}/${dataset.venues.length} coaches=${coachProfiles.resolved}/${dataset.teams.length} weather=${Object.keys(weather.matchWeather).length}`,
  );
  if (playerPhotoResult.errors.length) {
    console.warn(`[generate-intel-packs] player photo skips=${playerPhotoResult.errors.length}`);
  }
  if (venuePhotoResult.errors.length) {
    console.warn(`[generate-intel-packs] venue photo skips=${venuePhotoResult.errors.length}`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

async function materializePlayerPhotos() {
  const cache = existsSync(playerPhotoCacheFile) ? JSON.parse(readFileSync(playerPhotoCacheFile, 'utf8')) : [];
  const resolved = cache
    .filter((item) => item.status === 'resolved' && item.playerId && (item.filename || item.sourceUrl))
    .sort((a, b) => a.playerId.localeCompare(b.playerId));
  const selected = Number.isFinite(playerLimit) && playerLimit > 0 ? resolved.slice(0, playerLimit) : resolved;
  let downloaded = 0;
  const errors = [];

  for (const item of selected) {
    const target = join(playerPhotoDir, `${item.playerId}.webp`);
    if (existsSync(target) && !force) {
      downloaded++;
      continue;
    }
    if (!downloadPlayers) continue;
    const url = item.filename ? commonsFilePath(item.filename, 420) : normalizeCommonsImageUrl(item.sourceUrl, 420);
    if (!url) continue;
    try {
      await fetchConvert(url, target, {
        label: `player:${item.playerId}`,
        resize: '360x360^',
        extent: '360x360',
        quality: '78',
      });
      downloaded++;
    } catch (err) {
      errors.push(`${item.playerId}: ${(err).message}`);
    }
  }

  return { resolved: resolved.length, considered: selected.length, downloaded, errors };
}

async function materializeVenuePhotos() {
  let downloaded = 0;
  const downloadedExts = {};
  const credits = {};
  const errors = [];

  for (const venue of dataset.venues) {
    const filename = VENUE_PHOTO_FILES[venue.id];
    if (!filename) continue;
    const target = join(venuePhotoDir, `${venue.id}.webp`);
    if (existsSync(target) && !force) {
      downloaded++;
      downloadedExts[venue.id] = 'webp';
      const enc = encodeURIComponent(filename);
      credits[venue.id] = {
        src: `/venue-photos/${venue.id}.webp`,
        page: `https://commons.wikimedia.org/wiki/File:${enc}`,
        source: 'Wikimedia Commons',
      };
      continue;
    }
    if (!downloadVenues) continue;
    if (!existsSync(target) || force) {
      try {
        await fetchConvert(commonsFilePath(filename, 1200), target, {
          label: `venue:${venue.id}`,
          resize: '1200x675^',
          extent: '1200x675',
          quality: '76',
        });
      } catch (err) {
        errors.push(`${venue.id}: ${(err).message}`);
        continue;
      }
    }
    downloaded++;
    downloadedExts[venue.id] = 'webp';
    const enc = encodeURIComponent(filename);
    credits[venue.id] = {
      src: `/venue-photos/${venue.id}.webp`,
      page: `https://commons.wikimedia.org/wiki/File:${enc}`,
      source: 'Wikimedia Commons',
    };
  }

  return { downloaded, downloadedExts, credits, errors };
}

async function resolveCoachProfiles() {
  const pageTitles = dataset.teams.map((team) => TEAM_PAGES[team.code]).filter(Boolean);
  const pages = await fetchWikipediaPages(pageTitles);
  const coachByTeam = {};
  const coachTitles = [];

  for (const team of dataset.teams) {
    const requestedTitle = TEAM_PAGES[team.code];
    const page = requestedTitle ? pages.get(requestedTitle) : null;
    const parsed = page ? parseCoachField(page.content) : null;
    if (parsed?.pageTitle) coachTitles.push(parsed.pageTitle);
    coachByTeam[team.code] = {
      team: team.code,
      teamName: team.name,
      name: parsed?.name ?? null,
      pageTitle: parsed?.pageTitle ?? null,
      pageUrl: parsed?.pageTitle
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(parsed.pageTitle.replaceAll(' ', '_'))}`
        : null,
      photo: null,
      source: page?.title ? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` : null,
      status: parsed ? 'resolved' : 'missing',
      updatedAt: generatedAt,
    };
  }

  const summaries = await fetchWikipediaSummaries([...new Set(coachTitles)]);
  let resolved = 0;
  for (const team of dataset.teams) {
    const item = coachByTeam[team.code];
    if (!item?.pageTitle) continue;
    const summary = summaries.get(item.pageTitle);
    const image = normalizeCommonsImageUrl(summary?.originalimage?.source ?? summary?.thumbnail?.source, 420);
    if (image) {
      const target = join(coachPhotoDir, `${team.code}.webp`);
      if ((!existsSync(target) || force) && downloadCoaches) {
        try {
          await fetchConvert(image, target, {
            label: `coach:${team.code}`,
            resize: '320x320^',
            extent: '320x320',
            quality: '78',
          });
        } catch {
          // Keep the profile; only the local image is optional.
        }
      }
      if (existsSync(target)) item.photo = `/coach-photos/${team.code}.webp`;
    }
    item.summary = summary?.description ?? null;
    item.pageUrl = summary?.content_urls?.desktop?.page ?? item.pageUrl;
    resolved++;
  }

  return {
    resolved,
    missing: dataset.teams.length - resolved,
    items: Object.fromEntries(Object.entries(coachByTeam).sort(([a], [b]) => a.localeCompare(b))),
  };
}

async function buildWeatherBaseline(venueExtras) {
  const byVenue = {};
  const matchWeather = {};
  const venuesById = Object.fromEntries(dataset.venues.map((venue) => [venue.id, venue]));

  for (const venue of dataset.venues) {
    const extra = venueExtras[venue.id];
    if (!extra?.latitude || !extra?.longitude) continue;
    const baseline = await fetchWeatherArchive(extra.latitude, extra.longitude, '2025-06-11', '2025-07-19');
    if (baseline) byVenue[venue.id] = baseline;
    await sleep(fetchDelayMs);
  }

  for (const match of dataset.matches) {
    const baseline = byVenue[match.venue];
    const venue = venuesById[match.venue];
    const day = baseline?.days?.[monthDay(match.date)];
    if (!day || !venue) continue;
    matchWeather[match.id] = {
      matchId: match.id,
      venue: match.venue,
      city: venue.city,
      date: match.date,
      sourceDate: `2025-${monthDay(match.date)}`,
      type: 'baseline-2025',
      temperatureMaxC: day.temperatureMaxC,
      temperatureMinC: day.temperatureMinC,
      precipitationMm: day.precipitationMm,
      note: 'Referencia meteorológica del mismo día calendario en 2025; no es pronóstico oficial del partido.',
    };
  }

  return {
    matchWeather,
    meta: {
      source: 'Open-Meteo Archive API',
      sourceUrl: 'https://archive-api.open-meteo.com/v1/archive',
      type: 'historical-baseline',
      generatedAt,
      matchesCovered: Object.keys(matchWeather).length,
    },
  };
}

function parseVenueExtras() {
  const lines = readFileSync(stadiumsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('city,'));
  const byName = new Map(dataset.venues.map((venue) => [venue.stadium, venue.id]));
  const extras = {};
  for (const line of lines) {
    const parts = line.split(',').map((part) => part.trim());
    const [rawCity, timezone, countryCode, stadium, capacity, wikipedia, wikidata] = parts;
    const coords = parts.slice(7).join(',').trim();
    const id = byName.get(stadium);
    if (!id) continue;
    const parsed = parseCoords(coords);
    extras[id] = {
      id,
      cityLabel: rawCity,
      timezone,
      countryCode,
      wikipedia: `https://en.wikipedia.org/wiki/${wikipedia}`,
      wikidata: wikidata ? `https://www.wikidata.org/wiki/${wikidata}` : null,
      latitude: parsed?.latitude ?? null,
      longitude: parsed?.longitude ?? null,
      capacity: Number(capacity) || null,
      source: 'Sedes del torneo',
    };
  }
  return Object.fromEntries(Object.entries(extras).sort(([a], [b]) => a.localeCompare(b)));
}

function parseCoords(value) {
  if (!value) return null;
  const decimal = value.match(/([0-9.]+)°([NS])\s+([0-9.]+)°([EW])/i);
  if (decimal) {
    return {
      latitude: signed(Number(decimal[1]), decimal[2]),
      longitude: signed(Number(decimal[3]), decimal[4]),
    };
  }
  const dms = value.match(/(\d+)°(\d+)'(?:(\d+(?:\.\d+)?)")?([NS])\s+(\d+)°(\d+)'(?:(\d+(?:\.\d+)?)")?([EW])/i);
  if (!dms) return null;
  const lat = Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3] ?? 0) / 3600;
  const lon = Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7] ?? 0) / 3600;
  return { latitude: round(signed(lat, dms[4])), longitude: round(signed(lon, dms[8])) };
}

function signed(value, hemi) {
  const sign = /[SW]/i.test(hemi) ? -1 : 1;
  return round(value * sign);
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

async function fetchWeatherArchive(latitude, longitude, startDate, endDate) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  }).toString();
  try {
    const json = await fetchJson(url);
    const days = {};
    for (let i = 0; i < (json.daily?.time?.length ?? 0); i++) {
      const date = json.daily.time[i];
      days[monthDay(date)] = {
        temperatureMaxC: json.daily.temperature_2m_max?.[i] ?? null,
        temperatureMinC: json.daily.temperature_2m_min?.[i] ?? null,
        precipitationMm: json.daily.precipitation_sum?.[i] ?? null,
      };
    }
    return { generatedAt, days };
  } catch (err) {
    console.warn(`[generate-intel-packs] weather unavailable ${latitude},${longitude}: ${(err).message}`);
    return null;
  }
}

async function fetchWikipediaPages(titles) {
  const result = new Map();
  for (const chunk of chunks(titles, 45)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: chunk.join('|'),
    });
    const json = await fetchJson(new URL(`https://en.wikipedia.org/w/api.php?${params}`));
    const normalized = new Map((json.query?.normalized ?? []).map((item) => [item.from, item.to]));
    const redirects = new Map((json.query?.redirects ?? []).map((item) => [item.from, item.to]));
    const pages = new Map(
      (json.query?.pages ?? []).map((page) => [
        page.title,
        { title: page.title, content: page.revisions?.[0]?.slots?.main?.content ?? '' },
      ]),
    );
    for (const title of chunk) {
      const normalizedTitle = normalized.get(title) ?? title;
      const finalTitle = redirects.get(normalizedTitle) ?? normalizedTitle;
      result.set(title, pages.get(finalTitle) ?? null);
    }
    await sleep(fetchDelayMs);
  }
  return result;
}

async function fetchWikipediaSummaries(titles) {
  const summaries = new Map();
  for (const title of titles) {
    try {
      const summary = await fetchJson(new URL(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`));
      summaries.set(title, summary);
    } catch {
      summaries.set(title, null);
    }
    await sleep(fetchDelayMs);
  }
  return summaries;
}

function parseCoachField(wikitext) {
  const names = ['Coach', 'Manager', 'Head coach'];
  for (const line of wikitext.split('\n')) {
    const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (!match || !names.some((name) => name.toLowerCase() === match[1].trim().toLowerCase())) continue;
    const value = cleanWikiValue(match[2]);
    const link = value.match(/\[\[\s*([^|\]#]+)(?:\|([^\]]+))?\]\]/);
    const pageTitle = (link?.[1] ?? value).replace(/^File:/i, '').trim();
    const name = (link?.[2] ?? link?.[1] ?? value)
      .replace(/\{\{.*?\}\}/g, '')
      .replace(/\[\[|\]\]/g, '')
      .trim();
    if (name && pageTitle) return { name, pageTitle };
  }
  return null;
}

function cleanWikiValue(value = '') {
  return value
    .replace(/<!--.*?-->/g, '')
    .replace(/<ref\b[^>]*>.*?<\/ref>/gi, '')
    .replace(/<ref\b[^/]*\/>/gi, '')
    .replace(/\{\{nowrap\|(.+?)\}\}/gi, '$1')
    .trim();
}

async function fetchConvert(url, target, opts) {
  const tmp = join(tempDir, `${opts.label.replace(/[^a-z0-9_-]/gi, '_')}${extFromUrl(url)}`);
  let res = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { headers: { 'user-agent': userAgent } });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      if (retryAfter >= 120) throw new Error(`rate-limited; retry-after=${retryAfter}s`);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 12_000;
      console.warn(`[generate-intel-packs] ${res.status} while downloading ${opts.label}; retrying in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    break;
  }
  if (!res?.ok) throw new Error(`HTTP ${res?.status ?? 'fetch'} ${res?.statusText ?? 'failed'}`);
  const mime = res.headers.get('content-type') ?? '';
  if (!mime.startsWith('image/')) throw new Error(`expected image response, got ${mime || 'unknown content-type'}`);
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  const result = spawnSync(
    'magick',
    [
      tmp,
      '-auto-orient',
      '-resize',
      opts.resize,
      '-gravity',
      'center',
      '-extent',
      opts.extent,
      '-strip',
      '-quality',
      opts.quality,
      target,
    ],
    { cwd: repoRoot, stdio: 'pipe' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.toString('utf8').trim() || `magick exited ${result.status}`);
  }
  await sleep(fetchDelayMs);
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after') ?? 0);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 10_000;
      console.warn(`[generate-intel-packs] ${res.status} from ${url.origin}; retrying in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  }
  throw new Error(`HTTP 429/503 persisted for ${url.origin}`);
}

function buildDataPacks(playerPhotos, venuePhotos, coaches, weather, venueExtras) {
  const officialManualItems = [
    'Trofeo/imagen comercial oficial de FIFA World Cup 26',
    'Balon oficial',
    'Badges comerciales de patrocinio',
    'Cualquier asset FIFA que no tenga licencia abierta o permiso propio',
  ];
  const totalPlayers = countPlayersFromGeneratedSource();
  const coachPhotoCount = Object.values(coaches.items ?? {}).filter((coach) => coach?.photo?.startsWith('/')).length;
  const kitVariantCount = countLocalKitVariants();
  const kitVariantTotal = dataset.teams.length * 3;
  const venueGalleryCount = countStaticImages(venueGalleryDir);
  const venueGalleryTotal = dataset.venues.length * 3;
  const brandAssetCount = countStaticImages(brandAssetDir);
  return [
    {
      id: 'player-photos',
      label: 'Fotos de jugadores',
      status: playerPhotos.downloaded === totalPlayers ? 'ready' : 'partial',
      count: playerPhotos.downloaded,
      total: totalPlayers,
      source: 'Wikimedia Commons / Wikipedia',
      note:
        playerPhotos.downloaded === playerPhotos.resolved
          ? `${playerPhotos.downloaded} fotos libres localizadas ya estan en WebP local; faltan ${Math.max(0, totalPlayers - playerPhotos.resolved)} jugadores sin fuente libre identificada.`
          : 'WebP locales disponibles; los jugadores restantes usan fallback remoto libre cuando existe.',
    },
    {
      id: 'coach-profiles',
      label: 'Entrenadores',
      status: coachPhotoCount === dataset.teams.length ? 'ready' : 'partial',
      count: coachPhotoCount,
      total: dataset.teams.length,
      source: 'Wikipedia / Wikimedia Commons',
      note: `${coaches.resolved}/${dataset.teams.length} perfiles resueltos; ${coachPhotoCount} fotos locales cuando Wikipedia expone imagen libre.`,
    },
    {
      id: 'squad-status',
      label: 'Plantillas y convocatorias',
      status: 'watching',
      count: totalPlayers,
      total: totalPlayers,
      source: 'Dataset curado local + futuras convocatorias FIFA',
      note: 'Los jugadores actuales no son lista final oficial; queda preparado para reemplazar por convocatoria final.',
    },
    {
      id: 'venue-photos',
      label: 'Fotos de estadios',
      status: venuePhotos.downloaded === dataset.venues.length ? 'ready' : 'partial',
      count: venuePhotos.downloaded,
      total: dataset.venues.length,
      source: 'Wikimedia Commons',
      note:
        venuePhotos.downloaded === dataset.venues.length
          ? 'Las 16 sedes estan optimizadas localmente para Vercel.'
          : `Locales: ${venuePhotos.downloaded}. El resto usa fallback remoto de Wikimedia hasta poder descargarse sin rate-limit.`,
    },
    {
      id: 'kit-variants',
      label: 'Uniformes home/away/third',
      status: kitVariantCount >= kitVariantTotal ? 'ready' : 'partial',
      count: kitVariantCount,
      total: kitVariantTotal,
      source: 'Wikipedia kit templates / assets manuales oficiales',
      note: 'Home y away descargados cuando Commons los expone; tercer kit parcial. GK queda como slot privado/manual.',
    },
    {
      id: 'weather',
      label: 'Clima por partido',
      status: Object.keys(weather.matchWeather).length ? 'ready' : 'partial',
      count: Object.keys(weather.matchWeather).length,
      total: dataset.matches.length,
      source: 'Open-Meteo Archive API',
      note: 'Baseline 2025 por fecha equivalente; se puede reemplazar por forecast cuando falten menos dias.',
    },
    {
      id: 'venue-map',
      label: 'Mapas, coordenadas y husos',
      status: 'ready',
      count: Object.keys(venueExtras).length,
      total: dataset.venues.length,
      source: 'Sedes del torneo',
      note: 'Lat/lon, zona UTC, Wikidata y Wikipedia por sede.',
    },
    {
      id: 'venue-gallery',
      label: 'Galerías de sedes',
      status: venueGalleryCount >= venueGalleryTotal ? 'ready' : venueGalleryCount > 0 ? 'partial' : 'watching',
      count: venueGalleryCount,
      total: venueGalleryTotal,
      source: 'Wikimedia Commons',
      note:
        venueGalleryCount >= venueGalleryTotal
          ? 'Galerias locales completas: 3 miniaturas por cada sede.'
          : venueGalleryCount > 0
          ? 'Miniaturas locales adicionales; pausado cuando Wikimedia aplica rate-limit.'
          : 'Preparado para bajar 3 imagenes por sede cuando no haya rate-limit.',
    },
    {
      id: 'head-to-head',
      label: 'Historial H2H',
      status: 'watching',
      count: 1,
      total: dataset.matches.length,
      source: 'FIFA/Wikipedia manual review',
      note: 'MEX-RSA marcado como partido historico de apertura 2010; resto queda para pipeline.',
    },
    {
      id: 'rankings',
      label: 'Rankings FIFA/Elo',
      status: 'watching',
      count: 0,
      total: dataset.teams.length,
      source: 'Fuente viva pendiente de conectar',
      note: 'Preparado para fuente actualizada; no se inventan rankings si no hay feed confiable.',
    },
    {
      id: 'match-officials',
      label: 'Arbitros y oficiales',
      status: 'watching',
      count: 0,
      total: dataset.matches.length,
      source: 'FIFA cuando publique designaciones',
      note: 'Pendiente por naturaleza: se asigna muy cerca de cada partido.',
    },
    {
      id: 'official-commercial-assets',
      label: 'Assets comerciales oficiales',
      status: 'manual',
      count: Math.min(brandAssetCount, officialManualItems.length),
      total: officialManualItems.length,
      source: 'Carga manual con permiso/licencia',
      note:
        brandAssetCount > 0
          ? 'Marca privada cargada en static/brand; balon/trofeo/badges quedan como carga manual si hay permiso.'
          : `No se descargan automaticamente: ${officialManualItems.join('; ')}.`,
    },
  ];
}

function writeGeneratedFile(payload) {
  mkdirSync(dirname(generatedFile), { recursive: true });
  const file = `// Generated by scripts/generate-intel-packs.mjs. Do not edit manually.
export type IntelPackStatus = 'ready' | 'partial' | 'watching' | 'manual';

export interface IntelDataPack {
  id: string;
  label: string;
  status: IntelPackStatus;
  count: number;
  total: number;
  source: string;
  note: string;
}

export interface VenueExtra {
  id: string;
  cityLabel: string;
  timezone: string;
  countryCode: string;
  wikipedia: string;
  wikidata: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  source: string;
}

export interface CoachProfile {
  team: string;
  teamName: string;
  name: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  photo: string | null;
  source: string | null;
  status: 'resolved' | 'missing';
  updatedAt: string;
  summary?: string | null;
}

export interface MatchWeather {
  matchId: string;
  venue: string;
  city: string;
  date: string;
  sourceDate: string;
  type: 'baseline-2025';
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationMm: number | null;
  note: string;
}

export const intelGeneratedAt = ${JSON.stringify(payload.generatedAt)};

export const intelDataPacks: IntelDataPack[] = ${JSON.stringify(payload.dataPacks, null, 2)};

export const venueExtras: Record<string, VenueExtra> = ${JSON.stringify(payload.venueExtras, null, 2)};

export const downloadedVenuePhotoExts: Record<string, 'webp'> = ${JSON.stringify(payload.downloadedVenuePhotoExts, null, 2)};

export const venuePhotoCredits: Record<string, { src: string; page: string; source: string }> = ${JSON.stringify(payload.venuePhotoCredits, null, 2)};

export const coachProfiles = ${JSON.stringify(payload.coachProfiles, null, 2)} as const;

export const matchWeather: Record<string, MatchWeather> = ${JSON.stringify(payload.matchWeather, null, 2)};

export const weatherMeta = ${JSON.stringify(payload.weatherMeta, null, 2)} as const;
`;
  writeFileSync(generatedFile, file, 'utf8');
}

function countPlayersFromGeneratedSource() {
  const squads = readFileSync(join(repoRoot, 'packages', 'shared', 'src', 'data', 'squads.ts'), 'utf8');
  return (squads.match(/\[\s*['"`]/g) ?? []).length;
}

function countLocalKitVariants() {
  if (!existsSync(teamKitDir)) return 0;
  const variants = new Set();
  for (const file of readdirSync(teamKitDir)) {
    const match = file.match(/^([A-Z]{3})(?:-(home|away|third|gk))?\.(?:png|jpg|jpeg|webp|svg)$/);
    if (!match) continue;
    const variant = match[2] ?? 'home';
    if (['home', 'away', 'third'].includes(variant)) variants.add(`${match[1]}:${variant}`);
  }
  return variants.size;
}

function countStaticImages(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((file) => /\.(?:png|jpe?g|webp|svg)$/i.test(file)).length;
}

function commonsFilePath(filename, width) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`;
}

function normalizeCommonsImageUrl(url, width) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('wikimedia.org')) return url;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const filename = parts.at(-1);
    if (!filename) return url;
    return commonsFilePath(decodeURIComponent(filename.replace(/^\d+px-/, '')), width);
  } catch {
    return url;
  }
}

function extFromUrl(value) {
  const ext = extname(new URL(value).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.img';
}

function monthDay(date) {
  return date.slice(5);
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
