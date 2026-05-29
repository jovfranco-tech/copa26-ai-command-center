/**
 * Open-data importer (NOT a scraper). Reads the vendored openfootball CC0 files
 * for World Cup 2026 and writes packages/shared/src/data/worldcup2026.json — the
 * app's REAL dataset: real teams, groups, venues and the full match schedule.
 *
 * Source: https://github.com/openfootball/world-cup (2026--usa), CC0 1.0.
 * Player squads/stats and results are intentionally absent: the tournament has
 * not been played yet (kickoff 2026-06-11), so those simply do not exist.
 *
 * Run: pnpm --filter @worldcup/ingestion import:openfootball
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(HERE, '..', 'vendor', 'openfootball-2026');
const OUT = join(HERE, '..', '..', 'shared', 'src', 'data', 'worldcup2026.json');

// openfootball team name -> { code (FIFA-style), iso2 (flagcdn), colorA, colorB }
const TEAM_META: Record<string, { code: string; iso2: string; colorA: string; colorB: string }> = {
  Mexico: { code: 'MEX', iso2: 'mx', colorA: '#1c8a4d', colorB: '#c8102e' },
  'South Africa': { code: 'RSA', iso2: 'za', colorA: '#007a4d', colorB: '#ffb612' },
  'South Korea': { code: 'KOR', iso2: 'kr', colorA: '#c8102e', colorB: '#0a2a6b' },
  'Czech Republic': { code: 'CZE', iso2: 'cz', colorA: '#11457e', colorB: '#d7141a' },
  Canada: { code: 'CAN', iso2: 'ca', colorA: '#d52b1e', colorB: '#ffffff' },
  'Bosnia & Herzegovina': { code: 'BIH', iso2: 'ba', colorA: '#002395', colorB: '#fecb00' },
  Qatar: { code: 'QAT', iso2: 'qa', colorA: '#7a1336', colorB: '#ffffff' },
  Switzerland: { code: 'SUI', iso2: 'ch', colorA: '#d52b1e', colorB: '#ffffff' },
  Brazil: { code: 'BRA', iso2: 'br', colorA: '#f7d417', colorB: '#1c8a4d' },
  Morocco: { code: 'MAR', iso2: 'ma', colorA: '#c1272d', colorB: '#006233' },
  Haiti: { code: 'HAI', iso2: 'ht', colorA: '#00209f', colorB: '#d21034' },
  Scotland: { code: 'SCO', iso2: 'gb-sct', colorA: '#0065bf', colorB: '#ffffff' },
  USA: { code: 'USA', iso2: 'us', colorA: '#1b3c8f', colorB: '#c8102e' },
  Paraguay: { code: 'PAR', iso2: 'py', colorA: '#d52b1e', colorB: '#0038a8' },
  Australia: { code: 'AUS', iso2: 'au', colorA: '#f4c430', colorB: '#1c6b3c' },
  Turkey: { code: 'TUR', iso2: 'tr', colorA: '#c8102e', colorB: '#ffffff' },
  Germany: { code: 'GER', iso2: 'de', colorA: '#3a3a3a', colorB: '#f4c430' },
  'Curaçao': { code: 'CUW', iso2: 'cw', colorA: '#002b7f', colorB: '#f9d616' },
  'Ivory Coast': { code: 'CIV', iso2: 'ci', colorA: '#ec5a13', colorB: '#1c8a4d' },
  Ecuador: { code: 'ECU', iso2: 'ec', colorA: '#f4c430', colorB: '#003087' },
  Netherlands: { code: 'NED', iso2: 'nl', colorA: '#ec5a13', colorB: '#1b3c8f' },
  Japan: { code: 'JPN', iso2: 'jp', colorA: '#0a2a6b', colorB: '#e23636' },
  Sweden: { code: 'SWE', iso2: 'se', colorA: '#005baf', colorB: '#f4c430' },
  Tunisia: { code: 'TUN', iso2: 'tn', colorA: '#c8102e', colorB: '#ffffff' },
  Belgium: { code: 'BEL', iso2: 'be', colorA: '#e30613', colorB: '#f4c430' },
  Egypt: { code: 'EGY', iso2: 'eg', colorA: '#c8102e', colorB: '#222222' },
  Iran: { code: 'IRN', iso2: 'ir', colorA: '#1c8a4d', colorB: '#c8102e' },
  'New Zealand': { code: 'NZL', iso2: 'nz', colorA: '#1b3c8f', colorB: '#ffffff' },
  Spain: { code: 'ESP', iso2: 'es', colorA: '#c8102e', colorB: '#f4c430' },
  'Cape Verde': { code: 'CPV', iso2: 'cv', colorA: '#003893', colorB: '#cf2027' },
  'Saudi Arabia': { code: 'KSA', iso2: 'sa', colorA: '#1c6b3c', colorB: '#ffffff' },
  Uruguay: { code: 'URU', iso2: 'uy', colorA: '#56a0d3', colorB: '#0a1a2f' },
  France: { code: 'FRA', iso2: 'fr', colorA: '#1f3a93', colorB: '#e23636' },
  Senegal: { code: 'SEN', iso2: 'sn', colorA: '#1c8a4d', colorB: '#f4c430' },
  Iraq: { code: 'IRQ', iso2: 'iq', colorA: '#007a3d', colorB: '#ce1126' },
  Norway: { code: 'NOR', iso2: 'no', colorA: '#c60c30', colorB: '#0a2a6b' },
  Argentina: { code: 'ARG', iso2: 'ar', colorA: '#75aadb', colorB: '#ffffff' },
  Algeria: { code: 'ALG', iso2: 'dz', colorA: '#1c8a4d', colorB: '#ffffff' },
  Austria: { code: 'AUT', iso2: 'at', colorA: '#cf142b', colorB: '#ffffff' },
  Jordan: { code: 'JOR', iso2: 'jo', colorA: '#007a3d', colorB: '#ce1126' },
  Portugal: { code: 'POR', iso2: 'pt', colorA: '#006847', colorB: '#c8102e' },
  'DR Congo': { code: 'COD', iso2: 'cd', colorA: '#007fff', colorB: '#f7d518' },
  Uzbekistan: { code: 'UZB', iso2: 'uz', colorA: '#1eb53a', colorB: '#0099b5' },
  Colombia: { code: 'COL', iso2: 'co', colorA: '#f4c430', colorB: '#003087' },
  England: { code: 'ENG', iso2: 'gb-eng', colorA: '#dfe3ea', colorB: '#cf142b' },
  Croatia: { code: 'CRO', iso2: 'hr', colorA: '#c8102e', colorB: '#1b3c8f' },
  Ghana: { code: 'GHA', iso2: 'gh', colorA: '#c8102e', colorB: '#f4c430' },
  Panama: { code: 'PAN', iso2: 'pa', colorA: '#005293', colorB: '#c8102e' },
};

// exact openfootball city string -> { id, city (clean label) }
const VENUE_ID: Record<string, string> = {
  Vancouver: 'van',
  Seattle: 'sea',
  'San Francisco Bay Area (Santa Clara)': 'sf',
  'Los Angeles (Inglewood)': 'lax',
  'Guadalajara (Zapopan)': 'gdl',
  'Mexico City': 'mex',
  'Monterrey (Guadalupe)': 'mty',
  Houston: 'hou',
  'Dallas (Arlington)': 'dal',
  'Kansas City': 'kc',
  Atlanta: 'atl',
  'Miami (Miami Gardens)': 'mia',
  Toronto: 'tor',
  'Boston (Foxborough)': 'bos',
  Philadelphia: 'phi',
  'New York/New Jersey (East Rutherford)': 'nyc',
};

const COUNTRY = { us: 'USA', ca: 'Canada', mx: 'Mexico' } as const;
const MONTHS: Record<string, string> = { June: '06', July: '07' };

function meta(name: string) {
  const m = TEAM_META[name.trim()];
  if (!m) throw new Error(`No TEAM_META for "${name}". Update import-openfootball.ts.`);
  return m;
}
function cleanCity(c: string): string {
  return c.replace(/\s*\(.*\)$/, '').trim();
}

function main() {
  const cupTxt = readFileSync(join(VENDOR, 'cup.txt'), 'utf8');
  const stadiumsCsv = readFileSync(join(VENDOR, 'cup_stadiums.csv'), 'utf8');

  // --- venues ---
  const venues = stadiumsCsv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('city,'))
    .map((l) => {
      const f = l.split(',').map((x) => x.trim());
      const [city, , cc, name, capacity] = f;
      const id = VENUE_ID[city!];
      if (!id) throw new Error(`No VENUE_ID for "${city}"`);
      return {
        id,
        stadium: name!,
        city: cleanCity(city!),
        country: COUNTRY[(cc as keyof typeof COUNTRY) ?? 'us'] ?? 'USA',
        capacity: Number(capacity) || null,
        surface: 'Grass',
        imageAssetId: null as string | null,
      };
    });

  // --- teams (from "Group X | t1 t2 t3 t4") ---
  const lines = cupTxt.split('\n');
  const teams: Array<Record<string, unknown>> = [];
  const groups: Array<{ letter: string; teams: string[] }> = [];
  for (const raw of lines) {
    const m = raw.match(/^Group ([A-L])\s*\|\s*(.+?)\s*$/);
    if (!m) continue;
    const letter = m[1]!;
    const names = m[2]!.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    const codes: string[] = [];
    for (const n of names) {
      const mm = meta(n);
      teams.push({
        id: mm.code,
        code: mm.code,
        name: n,
        group: letter,
        ranking: null,
        confederation: undefined,
        colorA: mm.colorA,
        colorB: mm.colorB,
        iso2: mm.iso2,
        flagAssetId: null,
        crestAssetId: null,
      });
      codes.push(mm.code);
    }
    groups.push({ letter, teams: codes });
  }
  if (teams.length !== 48) throw new Error(`Expected 48 teams, got ${teams.length}`);

  // --- matches (from "▪ Group X" blocks) ---
  const matches: Array<Record<string, unknown>> = [];
  let curGroup = '';
  let curDate = '';
  const groupCount: Record<string, number> = {};
  let seq = 1;
  for (const raw of lines) {
    const line = raw.trim();
    const g = line.match(/^▪ Group ([A-L])$/);
    if (g) {
      curGroup = g[1]!;
      curDate = '';
      continue;
    }
    if (!curGroup) continue;
    const d = line.match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(June|July)\s+(\d{1,2})$/);
    if (d) {
      curDate = `2026-${MONTHS[d[1]!]}-${String(Number(d[2])).padStart(2, '0')}`;
      continue;
    }
    const mm = line.match(/^(\d{1,2}:\d{2})\s+UTC[-+\d:]*\s+(.+?)\s+v\s+(.+?)\s+@\s+(.+?)$/);
    if (mm && curDate) {
      const [, time, homeName, awayName, city] = mm;
      const idx = (groupCount[curGroup] = (groupCount[curGroup] ?? 0) + 1) - 1;
      matches.push({
        id: 'M' + String(seq).padStart(3, '0'),
        stage: `Group ${curGroup}`,
        group: curGroup,
        round: `Matchday ${Math.floor(idx / 2) + 1}`,
        matchday: Math.floor(idx / 2) + 1,
        home: meta(homeName!).code,
        away: meta(awayName!).code,
        homeGoals: null,
        awayGoals: null,
        status: 'UPCOMING',
        minute: null,
        date: curDate,
        time: time!,
        venue: VENUE_ID[city!.trim()] ?? '',
        possH: null,
        shotsH: null,
        shotsA: null,
        shotsTH: null,
        shotsTA: null,
      });
      seq++;
    }
  }
  if (matches.length !== 72) throw new Error(`Expected 72 group matches, got ${matches.length}`);

  const dataset = {
    meta: {
      source: 'openfootball/world-cup (2026--usa)',
      license: 'CC0-1.0',
      generatedAt: new Date().toISOString().slice(0, 10),
      note: 'Real WC2026 teams/groups/venues/schedule. No squads/results yet (tournament not played).',
    },
    teams,
    venues,
    matches,
    groups,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  if (!existsSync(OUT)) throw new Error('write failed');
  console.log(
    `[import:openfootball] wrote ${OUT}\n  ${teams.length} teams, ${groups.length} groups, ${venues.length} venues, ${matches.length} matches`,
  );
}

main();
