import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const squadsFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'squads.ts');
const cacheFile = join(repoRoot, 'scraped-cache', 'json', 'player-fc26-ratings.json');
const generatedFile = join(repoRoot, 'apps', 'web', 'src', 'generated', 'playerRatings.ts');
const force = process.env.FC26_RATINGS_FORCE === '1';
const retryMissing = process.env.FC26_RATINGS_RETRY_MISSING === '1';
const download = process.env.FC26_RATINGS_DOWNLOAD !== '0';
const minDelayMs = Math.max(0, Number(process.env.FC26_RATINGS_MIN_DELAY_MS ?? 180));
const maxDelayMs = Math.max(minDelayMs, Number(process.env.FC26_RATINGS_MAX_DELAY_MS ?? 420));
const userAgent =
  process.env.INGEST_USER_AGENT ??
  'FIFA-Private-Dashboard/0.1 (personal FC26 rating resolver; contact unavailable)';

const NAME_ALIASES = {
  'Vinícius Júnior': ['Vini Jr.', 'Vinicius Junior'],
  'Julián Álvarez': ['Julián Alvarez', 'Julian Alvarez'],
  'Bruno Guimarães': ['Bruno Guimarães Moura', 'Bruno Guimaraes'],
  'Éder Militão': ['Éder Militão', 'Eder Militao'],
  'Gabriel Magalhães': ['Gabriel', 'Gabriel Magalhaes'],
  'Cristiano Ronaldo': ['Cristiano Ronaldo dos Santos Aveiro'],
  'Rúben Dias': ['Rúben Santos Gato Alves Dias', 'Ruben Dias'],
  'João Félix': ['João Félix Sequeira', 'Joao Felix'],
  'João Cancelo': ['João Pedro Cavaco Cancelo', 'Joao Cancelo'],
  'Khvicha Kvaratskhelia': ['Kvaratskhelia'],
  'Ollie Watkins': ['Oliver Watkins'],
  'Marc Guéhi': ['Marc Guehi'],
  'Nicolò Barella': ['Nicolo Barella'],
  'Gianluigi Donnarumma': ['G. Donnarumma'],
  'Federico Valverde': ['Fede Valverde'],
  'Antoine Griezmann': ['A. Griezmann'],
  'Aurélien Tchouaméni': ['Aurelien Tchouameni'],
  'Nicolás Otamendi': ['Nicolas Otamendi'],
  'Lautaro Martínez': ['Lautaro Martinez'],
  'Emiliano Martínez': ['Emiliano Martinez'],
  'Unai Simón': ['Unai Simon'],
  'Fabián Ruiz': ['Fabian Ruiz'],
  'Robin Le Normand': ['Robin Le Normand'],
  'İlkay Gündoğan': ['İlkay Gündoğan', 'Ilkay Gündogan', 'Ilkay Gundogan'],
  'Hakan Çalhanoğlu': ['Hakan Çalhanoğlu', 'Hakan Calhanoglu'],
  'Kerem Aktürkoğlu': ['Kerem Aktürkoğlu', 'Kerem Akturkoglu'],
  'Edson Álvarez': ['Edson Alvarez'],
  'Santiago Giménez': ['Santiago Gimenez'],
  'Luis Díaz': ['Luis Diaz'],
  'Dávinson Sánchez': ['Davinson Sánchez', 'Davinson Sanchez'],
  'James Rodríguez': ['James Rodriguez'],
  'Giorgian de Arrascaeta': ['Giorgian De Arrascaeta'],
  'José María Giménez': ['José María Giménez', 'Jose Maria Gimenez'],
  'Federico Viñas': ['Federico Vinas'],
  'Achraf Hakimi': ['A. Hakimi'],
  'Hakim Ziyech': ['H. Ziyech'],
  'Ismaïla Sarr': ['Ismaila Sarr'],
  'Pape Matar Sarr': ['Pape Matar Sarr'],
  'Serhou Guirassy': ['S. Guirassy'],
  'Mohamed Amoura': ['M. Amoura'],
  'Riyad Mahrez': ['R. Mahrez'],
  'Wilfried Singo': ['W. Singo'],
  'Franck Kessié': ['Franck Kessié', 'Franck Kessie'],
  'Sébastien Haller': ['Sébastien Haller', 'Sebastien Haller'],
  'Mohammed Kudus': ['M. Kudus'],
  'Inaki Williams': ['Iñaki Williams', 'Inaki Williams'],
  'Jordan Ayew': ['J. Ayew'],
  'Alphonso Davies': ['A. Davies'],
  'Jonathan David': ['J. David'],
  'Tajon Buchanan': ['T. Buchanan'],
  'Christian Pulisic': ['C. Pulisic'],
  'Timothy Weah': ['T. Weah'],
  'Antonee Robinson': ['A. Robinson'],
  'Tyler Adams': ['T. Adams'],
  'Hirving Lozano': ['H. Lozano'],
  'Andrés Guardado': ['Andres Guardado'],
  'Son Heung-min': ['Heung Min Son', 'Son'],
  'Kim Min-jae': ['Kim Min Jae', 'Min Jae Kim'],
  'Lee Kang-in': ['Lee Kang In', 'Kang In Lee'],
  'Hwang Hee-chan': ['Hwang Hee Chan', 'Hee Chan Hwang'],
  'Takefusa Kubo': ['T. Kubo'],
  'Kaoru Mitoma': ['K. Mitoma'],
  'Wataru Endo': ['W. Endo'],
  'Salem Al-Dawsari': ['S. Al Dawsari'],
  'Mathew Ryan': ['Maty Ryan'],
  'Pervis Estupiñán': ['Pervis Estupiñán', 'Pervis Estupinan'],
  'Moisés Caicedo': ['Moises Caicedo'],
  'Enner Valencia': ['E. Valencia'],
};

const players = parseSquads();
const cache = readCache();
const next = [];
let resolved = 0;

for (const player of players) {
  const cached = cache.get(player.id);
  if (cached && !force && !(retryMissing && cached.status !== 'resolved')) {
    next.push(cached);
    if (cached.status === 'resolved') resolved++;
    continue;
  }

  let entry = {
    id: player.id,
    name: player.name,
    team: player.team,
    status: 'missing',
    searched: searchNames(player.name),
    rating: null,
    resolvedAt: new Date().toISOString(),
  };

  if (download) {
    for (const query of entry.searched) {
      await politeDelay();
      const data = await fetchPlayerByName(query);
      if (!data || data.error || data.GENDER !== 'M') continue;
      entry = { ...entry, status: 'resolved', rating: normalizeRating(data, query) };
      break;
    }
  }

  next.push(entry);
  if (entry.status === 'resolved') {
    resolved++;
    console.log(`[fc26-ratings] ${player.id} ${player.name} -> ${entry.rating.name} ${entry.rating.overall}`);
  } else {
    console.log(`[fc26-ratings] missing ${player.id} ${player.name}`);
  }
}

mkdirSync(dirname(cacheFile), { recursive: true });
writeFileSync(cacheFile, `${JSON.stringify(next, null, 2)}\n`);
writeGeneratedFile(next);
console.log(`[fc26-ratings] resolved ${resolved}/${players.length}; generated apps/web/src/generated/playerRatings.ts`);

function parseSquads() {
  const out = [];
  let team = '';
  for (const line of readFileSync(squadsFile, 'utf8').split('\n')) {
    const teamMatch = line.match(/^\s{2}([A-Z0-9]{2,4}): \[/);
    if (teamMatch) {
      team = teamMatch[1];
      continue;
    }
    const entry = line.match(/^\s+\['((?:\\'|[^'])+)',\s*'(GK|DF|MF|FW)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*(\d+)/);
    if (!team || !entry) continue;
    const name = entry[1].replace(/\\'/g, "'");
    out.push({ id: `${team}-${out.filter((p) => p.team === team).length + 1}`, team, name });
  }
  return out;
}

function readCache() {
  if (!existsSync(cacheFile)) return new Map();
  const raw = JSON.parse(readFileSync(cacheFile, 'utf8'));
  return new Map((Array.isArray(raw) ? raw : []).map((item) => [item.id, item]));
}

function searchNames(name) {
  const names = [name, ...(NAME_ALIASES[name] ?? []), deaccent(name)];
  return [...new Set(names.map((v) => v.trim()).filter(Boolean))];
}

function normalizeRating(data, query) {
  const num = (key) => {
    const value = Number(data[key]);
    return Number.isFinite(value) ? value : 0;
  };
  const isGk = data.Position === 'GK';
  return {
    source: 'fc26',
    provider: 'EA SPORTS FC 26',
    providerId: data.ID,
    query,
    name: data.Name,
    position: data.Position,
    age: num('Age') || null,
    nation: data.Nation,
    team: data.Team,
    overall: num('OVR'),
    pace: isGk ? num('GK Diving') || num('PAC') : num('PAC'),
    shooting: isGk ? num('GK Handling') || num('SHO') : num('SHO'),
    passing: isGk ? num('GK Kicking') || num('PAS') : num('PAS'),
    dribbling: isGk ? num('GK Reflexes') || num('DRI') : num('DRI'),
    defending: isGk ? num('GK Positioning') || num('DEF') : num('DEF'),
    physical: num('PHY'),
    url: data.url,
    card: data.card || null,
  };
}

function writeGeneratedFile(items) {
  mkdirSync(dirname(generatedFile), { recursive: true });
  const ratings = Object.fromEntries(
    items
      .filter((item) => item.status === 'resolved' && item.rating)
      .map((item) => [
        item.id,
        {
          source: item.rating.source,
          provider: item.rating.provider,
          providerId: item.rating.providerId,
          providerName: item.rating.name,
          providerPosition: item.rating.position,
          providerTeam: item.rating.team,
          overall: item.rating.overall,
          pace: item.rating.pace,
          shooting: item.rating.shooting,
          passing: item.rating.passing,
          dribbling: item.rating.dribbling,
          defending: item.rating.defending,
          physical: item.rating.physical,
          url: item.rating.url,
        },
      ]),
  );
  const meta = {
    source: 'EA SPORTS FC 26 public player ratings',
    apiDocs: 'https://api.msmc.cc/fc26/',
    resolved: Object.keys(ratings).length,
    total: items.length,
    downloadedAt: new Date().toISOString(),
  };
  const file = `// Generated by scripts/download-fc26-player-ratings.mjs. Do not edit manually.
export type RatingSource = 'fc26';

export interface KnownPlayerRating {
  source: RatingSource;
  provider: string;
  providerId: string;
  providerName: string;
  providerPosition: string;
  providerTeam: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  url: string;
}

export const playerRatingMeta = ${JSON.stringify(meta, null, 2)} as const;

export const knownPlayerRatings: Record<string, KnownPlayerRating> = ${JSON.stringify(ratings, null, 2)};
`;
  writeFileSync(generatedFile, file);
}

async function fetchPlayerByName(name) {
  const url = `https://api.msmc.cc/api/fc26/player/name/${encodeURIComponent(name)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': userAgent } });
    if (res.status === 404) return null;
    if (res.ok) {
      const json = await res.json();
      if (!String(json?.error ?? '').toLowerCase().includes('too many requests')) return json;
      await sleep(10_000 * attempt);
      continue;
    }
    if (res.status !== 429 || attempt === 3) return null;
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) ? Math.max(1000, retryAfter * 1000) : 3000 * attempt);
  }
  return null;
}

function deaccent(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

async function politeDelay() {
  const span = maxDelayMs - minDelayMs;
  await sleep(minDelayMs + Math.floor(Math.random() * (span + 1)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
