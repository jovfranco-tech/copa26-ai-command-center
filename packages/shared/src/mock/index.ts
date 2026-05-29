/**
 * Local mock dataset — plausible 2026-style tournament (48 teams / 12 groups / 16 venues).
 * All data is fictional/plausible for design + offline development only. No official
 * affiliation, no real persons. Ported (and typed) from the approved prototype wc-data.js.
 *
 * This is what the app shows until you run the ingestion scripts and load SQLite.
 */
import { GROUP_LETTERS, POSITION_LONG, type Confederation, type Position } from '../constants.js';
import type {
  CacheMeta,
  Goalkeeper,
  Match,
  MatchEvent,
  Player,
  Team,
  Venue,
} from '../types.js';

/** Deterministic seeded PRNG so the dataset is identical on every load. */
function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// [name, code, colorA, colorB, fifaRanking]
const RAW_TEAMS: Array<[string, string, string, string, number]> = [
  ['Argentina', 'ARG', '#75AADB', '#ffffff', 1],
  ['France', 'FRA', '#1f3a93', '#e23636', 2],
  ['Spain', 'ESP', '#c8102e', '#f4c430', 3],
  ['England', 'ENG', '#dfe3ea', '#cf142b', 4],
  ['Brazil', 'BRA', '#f7d417', '#1c8a4d', 5],
  ['Portugal', 'POR', '#006847', '#c8102e', 6],
  ['Netherlands', 'NED', '#ec5a13', '#1b3c8f', 7],
  ['Belgium', 'BEL', '#e30613', '#f4c430', 8],
  ['Germany', 'GER', '#3a3a3a', '#f4c430', 9],
  ['Croatia', 'CRO', '#c8102e', '#1b3c8f', 10],
  ['Italy', 'ITA', '#1d6fb8', '#0d2d63', 11],
  ['Uruguay', 'URU', '#56a0d3', '#0a1a2f', 12],
  ['Colombia', 'COL', '#f4c430', '#003087', 13],
  ['Morocco', 'MAR', '#c1272d', '#006233', 14],
  ['USA', 'USA', '#1b3c8f', '#c8102e', 15],
  ['Mexico', 'MEX', '#1c8a4d', '#c8102e', 16],
  ['Canada', 'CAN', '#d52b1e', '#ffffff', 17],
  ['Japan', 'JPN', '#0a2a6b', '#e23636', 18],
  ['South Korea', 'KOR', '#c8102e', '#0a2a6b', 19],
  ['Senegal', 'SEN', '#1c8a4d', '#f4c430', 20],
  ['Switzerland', 'SUI', '#d52b1e', '#ffffff', 21],
  ['Denmark', 'DEN', '#c60c30', '#ffffff', 22],
  ['Austria', 'AUT', '#cf142b', '#ffffff', 23],
  ['Ecuador', 'ECU', '#f4c430', '#003087', 24],
  ['Australia', 'AUS', '#f4c430', '#1c6b3c', 25],
  ['Ukraine', 'UKR', '#0057b7', '#ffd700', 26],
  ['Sweden', 'SWE', '#005baf', '#f4c430', 27],
  ['Poland', 'POL', '#dfe3ea', '#dc143c', 28],
  ['Nigeria', 'NGA', '#1c8a4d', '#ffffff', 29],
  ['Ivory Coast', 'CIV', '#ec5a13', '#1c8a4d', 30],
  ['Egypt', 'EGY', '#c8102e', '#222222', 31],
  ['Ghana', 'GHA', '#c8102e', '#f4c430', 32],
  ['Cameroon', 'CMR', '#1c8a4d', '#c8102e', 33],
  ['Tunisia', 'TUN', '#c8102e', '#ffffff', 34],
  ['Algeria', 'ALG', '#1c8a4d', '#ffffff', 35],
  ['Serbia', 'SRB', '#c8102e', '#0a2a6b', 36],
  ['Turkey', 'TUR', '#c8102e', '#ffffff', 37],
  ['Norway', 'NOR', '#c60c30', '#0a2a6b', 38],
  ['Czechia', 'CZE', '#11457e', '#d7141a', 39],
  ['Hungary', 'HUN', '#1c8a4d', '#c8102e', 40],
  ['Peru', 'PER', '#d91023', '#ffffff', 41],
  ['Chile', 'CHI', '#0039a6', '#d52b1e', 42],
  ['Paraguay', 'PAR', '#d52b1e', '#0038a8', 43],
  ['Costa Rica', 'CRC', '#002b7f', '#c8102e', 44],
  ['Panama', 'PAN', '#005293', '#c8102e', 45],
  ['Saudi Arabia', 'KSA', '#1c6b3c', '#ffffff', 46],
  ['Iran', 'IRN', '#1c8a4d', '#c8102e', 47],
  ['Qatar', 'QAT', '#7a1336', '#ffffff', 48],
];

const CONFEDS: Confederation[] = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

export const TEAMS: Team[] = RAW_TEAMS.map(([name, code, colorA, colorB, ranking], i) => ({
  id: code,
  code,
  name,
  colorA,
  colorB,
  ranking,
  group: GROUP_LETTERS[Math.floor(i / 4)] ?? 'A',
  confederation: CONFEDS[i % CONFEDS.length],
  flagAssetId: null,
  crestAssetId: null,
}));

export const teamByCode: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);

export const GROUPS = GROUP_LETTERS.map((g) => ({
  letter: g,
  teams: TEAMS.filter((t) => t.group === g).map((t) => t.code),
}));

export const VENUES: Venue[] = [
  { id: 'nyc', city: 'New York / New Jersey', country: 'USA', stadium: 'East Rutherford Stadium', capacity: 82500, surface: 'Grass', imageAssetId: null },
  { id: 'dal', city: 'Dallas', country: 'USA', stadium: 'Arlington Stadium', capacity: 80000, surface: 'Grass', imageAssetId: null },
  { id: 'kc', city: 'Kansas City', country: 'USA', stadium: 'Kansas City Stadium', capacity: 76416, surface: 'Grass', imageAssetId: null },
  { id: 'lax', city: 'Los Angeles', country: 'USA', stadium: 'Inglewood Stadium', capacity: 70240, surface: 'Grass', imageAssetId: null },
  { id: 'sf', city: 'Bay Area', country: 'USA', stadium: 'Santa Clara Stadium', capacity: 68500, surface: 'Grass', imageAssetId: null },
  { id: 'sea', city: 'Seattle', country: 'USA', stadium: 'Seattle Stadium', capacity: 69000, surface: 'Turf', imageAssetId: null },
  { id: 'mia', city: 'Miami', country: 'USA', stadium: 'Miami Gardens Stadium', capacity: 65326, surface: 'Grass', imageAssetId: null },
  { id: 'atl', city: 'Atlanta', country: 'USA', stadium: 'Atlanta Stadium', capacity: 71000, surface: 'Turf', imageAssetId: null },
  { id: 'hou', city: 'Houston', country: 'USA', stadium: 'Houston Stadium', capacity: 72220, surface: 'Grass', imageAssetId: null },
  { id: 'phi', city: 'Philadelphia', country: 'USA', stadium: 'Philadelphia Stadium', capacity: 69796, surface: 'Grass', imageAssetId: null },
  { id: 'bos', city: 'Boston', country: 'USA', stadium: 'Foxborough Stadium', capacity: 65878, surface: 'Grass', imageAssetId: null },
  { id: 'tor', city: 'Toronto', country: 'Canada', stadium: 'Toronto Stadium', capacity: 45736, surface: 'Turf', imageAssetId: null },
  { id: 'van', city: 'Vancouver', country: 'Canada', stadium: 'Vancouver Stadium', capacity: 54500, surface: 'Turf', imageAssetId: null },
  { id: 'mex', city: 'Mexico City', country: 'Mexico', stadium: 'Mexico City Stadium', capacity: 87523, surface: 'Grass', imageAssetId: null },
  { id: 'gdl', city: 'Guadalajara', country: 'Mexico', stadium: 'Guadalajara Stadium', capacity: 48071, surface: 'Grass', imageAssetId: null },
  { id: 'mty', city: 'Monterrey', country: 'Mexico', stadium: 'Monterrey Stadium', capacity: 53500, surface: 'Grass', imageAssetId: null },
];

export const venueById: Record<string, Venue> = Object.fromEntries(VENUES.map((v) => [v.id, v]));

export const TODAY = '2026-06-19';

const ROUND_PAIRS = [
  [0, 1, 2, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2],
];
const KICKOFFS = ['12:00', '15:00', '18:00', '21:00'];

function buildMatches(): Match[] {
  const out: Match[] = [];
  const baseDate = new Date('2026-06-11T00:00:00');
  const today = new Date(`${TODAY}T00:00:00`);
  let seq = 1;

  GROUPS.forEach((grp, gi) => {
    const t = grp.teams;
    ROUND_PAIRS.forEach((order, round) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + round * 5 + (gi % 6));
      const pairs = [
        [t[order[0]!], t[order[1]!]],
        [t[order[2]!], t[order[3]!]],
      ];
      pairs.forEach((p, pi) => {
        const seed = seq * 13.37;
        const homeGoals = Math.floor(seededRand(seed) * 4);
        const awayGoals = Math.floor(seededRand(seed + 7) * 3);
        const mdate = new Date(date);
        const status: Match['status'] =
          mdate < today
            ? 'FT'
            : mdate.toDateString() === today.toDateString()
              ? pi === 0 && round === 1
                ? 'LIVE'
                : 'UPCOMING'
              : 'UPCOMING';
        const venue = VENUES[(gi * 2 + pi + round) % VENUES.length]!;
        const upcoming = status === 'UPCOMING';
        const possH = upcoming ? null : 42 + Math.floor(seededRand(seed + 3) * 18) + (homeGoals - awayGoals);
        const shotsH = upcoming ? null : 7 + Math.floor(seededRand(seed + 4) * 8) + homeGoals;
        const shotsA = upcoming ? null : 6 + Math.floor(seededRand(seed + 5) * 7) + awayGoals;
        out.push({
          id: 'M' + String(seq).padStart(3, '0'),
          stage: 'Group ' + grp.letter,
          group: grp.letter,
          round: 'Matchday ' + (round + 1),
          matchday: round + 1,
          home: p[0]!,
          away: p[1]!,
          homeGoals: upcoming ? null : homeGoals,
          awayGoals: upcoming ? null : awayGoals,
          status,
          minute: status === 'LIVE' ? 67 : null,
          date: mdate.toISOString().slice(0, 10),
          time: KICKOFFS[seq % KICKOFFS.length]!,
          venue: venue.id,
          possH,
          shotsH,
          shotsA,
          shotsTH: shotsH == null ? null : Math.max(homeGoals, Math.round(shotsH * 0.4)),
          shotsTA: shotsA == null ? null : Math.max(awayGoals, Math.round(shotsA * 0.4)),
        });
        seq++;
      });
    });
  });
  return out;
}

export const MATCHES: Match[] = buildMatches();

// [name, teamCode, pos, club, age, goals, assists, minutes, yellow, red, number]
const RAW_PLAYERS: Array<
  [string, string, Position, string, number, number, number, number, number, number, number]
> = [
  ['Lionel Aguilar', 'ARG', 'FW', 'Inter Miami', 33, 5, 3, 540, 1, 0, 10],
  ['Julián Bravo', 'ARG', 'FW', 'Atlético', 24, 4, 1, 470, 0, 0, 9],
  ['Enzo Castro', 'ARG', 'MF', 'Chelsea', 23, 1, 4, 540, 2, 0, 24],
  ['Kylian Mercier', 'FRA', 'FW', 'Real Madrid', 27, 6, 2, 510, 1, 0, 10],
  ['Aurélien Dubois', 'FRA', 'MF', 'Real Madrid', 25, 2, 3, 540, 1, 0, 8],
  ['Théo Laurent', 'FRA', 'DF', 'Bayern', 28, 0, 1, 540, 2, 0, 5],
  ['Pedro Ramos', 'ESP', 'MF', 'Barcelona', 18, 3, 5, 500, 0, 0, 16],
  ['Lamine Vega', 'ESP', 'FW', 'Barcelona', 18, 4, 4, 480, 1, 0, 19],
  ['Rodri Núñez', 'ESP', 'MF', 'Man City', 28, 1, 2, 540, 3, 0, 16],
  ['Harry Kingsley', 'ENG', 'FW', 'Bayern', 32, 5, 1, 540, 0, 0, 9],
  ['Jude Bellamy', 'ENG', 'MF', 'Real Madrid', 22, 4, 3, 540, 1, 0, 10],
  ['Bukayo Sterling', 'ENG', 'FW', 'Arsenal', 24, 3, 4, 500, 0, 0, 7],
  ['Vinícius Santos', 'BRA', 'FW', 'Real Madrid', 25, 5, 2, 510, 2, 0, 7],
  ['Rodrigo Lima', 'BRA', 'FW', 'Real Madrid', 24, 3, 3, 470, 1, 0, 11],
  ['Bruno Carvalho', 'BRA', 'MF', 'Man Utd', 30, 2, 4, 540, 1, 0, 8],
  ['Cristiano Sousa', 'POR', 'FW', 'Al-Nassr', 41, 4, 0, 450, 1, 0, 7],
  ['Bernardo Pires', 'POR', 'MF', 'Man City', 30, 2, 3, 540, 0, 0, 20],
  ['Rafael Leite', 'POR', 'FW', 'Milan', 26, 3, 2, 480, 2, 0, 17],
  ['Cody van Dijk', 'NED', 'FW', 'Liverpool', 29, 4, 1, 510, 1, 0, 9],
  ['Frenkie Bakker', 'NED', 'MF', 'Barcelona', 28, 1, 3, 540, 2, 0, 21],
  ['Romelu Lukas', 'BEL', 'FW', 'Napoli', 32, 4, 1, 500, 1, 0, 9],
  ['Kevin Verhoeven', 'BEL', 'MF', 'Man City', 34, 2, 5, 510, 0, 0, 7],
  ['Jamal Wagner', 'GER', 'MF', 'Bayern', 23, 3, 4, 540, 1, 0, 10],
  ['Florian Wirtzel', 'GER', 'MF', 'Liverpool', 22, 2, 3, 520, 0, 0, 17],
  ['Niko Havel', 'CRO', 'MF', 'Real Madrid', 39, 1, 2, 480, 2, 0, 10],
  ['Marco Rossini', 'ITA', 'FW', 'Inter', 27, 3, 1, 500, 1, 0, 9],
  ['Federico Conti', 'ITA', 'MF', 'Juventus', 25, 1, 2, 540, 2, 0, 14],
  ['Darwin Núñez Jr', 'URU', 'FW', 'Liverpool', 26, 4, 1, 490, 3, 0, 9],
  ['Federico Valdez', 'URU', 'MF', 'Real Madrid', 27, 2, 3, 540, 1, 0, 15],
  ['James Restrepo', 'COL', 'MF', 'León', 34, 3, 4, 510, 0, 0, 10],
  ['Luis Díaz Mejía', 'COL', 'FW', 'Liverpool', 29, 4, 2, 500, 1, 0, 7],
  ['Achraf Benali', 'MAR', 'DF', 'PSG', 27, 1, 3, 540, 2, 0, 2],
  ['Hakim Ziadi', 'MAR', 'MF', 'Galatasaray', 32, 2, 2, 500, 1, 0, 7],
  ['Christian Pulaski', 'USA', 'FW', 'Milan', 27, 3, 2, 510, 0, 0, 10],
  ['Gio Reyes', 'USA', 'MF', 'Dortmund', 23, 2, 3, 470, 1, 0, 7],
  ['Hirving Lozano Jr', 'MEX', 'FW', 'San Diego', 30, 3, 1, 490, 2, 0, 22],
  ['Santiago Gómez', 'MEX', 'FW', 'Feyenoord', 25, 2, 2, 480, 0, 0, 9],
  ['Alphonso Devon', 'CAN', 'FW', 'Bayern', 25, 2, 3, 510, 1, 0, 19],
  ['Takefusa Kubota', 'JPN', 'MF', 'Real Sociedad', 24, 3, 2, 500, 0, 0, 11],
  ['Sadio Diallo', 'SEN', 'FW', 'Al-Nassr', 34, 3, 1, 480, 1, 0, 10],
  ['Victor Oseni', 'NGA', 'FW', 'Napoli', 27, 4, 0, 500, 2, 0, 9],
  ['Mohamed Sabry', 'EGY', 'FW', 'Liverpool', 34, 4, 2, 510, 0, 0, 11],
  ['Erling Haavard', 'NOR', 'FW', 'Man City', 26, 6, 1, 520, 1, 0, 9],
  ['Dušan Vlahić', 'SRB', 'FW', 'Juventus', 26, 3, 0, 470, 2, 0, 9],
  ['Hakan Yıldız', 'TUR', 'MF', 'Inter', 30, 2, 3, 500, 1, 0, 10],
  ['Robert Lewinski', 'POL', 'FW', 'Barcelona', 38, 3, 1, 460, 1, 0, 9],
];

export const PLAYERS: Player[] = RAW_PLAYERS.map(
  ([name, team, pos, club, age, goals, assists, minutes, yellow, red, number], i) => ({
    id: 'P' + String(i + 1).padStart(3, '0'),
    name,
    team,
    pos,
    posLong: POSITION_LONG[pos],
    club,
    age,
    number,
    goals,
    assists,
    minutes,
    yellow,
    red,
    photoAssetId: null,
    profileUrl: null,
  }),
);

export const playerById: Record<string, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);

// [name, teamCode, saves, cleanSheets]
const RAW_GK: Array<[string, string, number, number]> = [
  ['Emiliano Vargas', 'ARG', 14, 2],
  ['Mike Doorman', 'NED', 13, 2],
  ['Unai Soler', 'ESP', 12, 3],
  ['Jordan Pickwell', 'ENG', 11, 1],
  ['Alisson Becker Jr', 'BRA', 12, 2],
  ['Diogo Coster', 'POR', 10, 1],
  ['Yann Sommerfeld', 'SUI', 15, 1],
  ['Manuel Neumann', 'GER', 11, 2],
  ['Bono Hassan', 'MAR', 13, 3],
  ['Matt Turner', 'USA', 12, 1],
  ['Guillermo Ochoa Jr', 'MEX', 14, 1],
  ['André Onan', 'CMR', 10, 0],
];

export const GOALKEEPERS: Goalkeeper[] = RAW_GK.map(([name, team, saves, cleanSheets], i) => ({
  id: 'GK' + (i + 1),
  name,
  team,
  saves,
  cleanSheets,
  pos: 'GK',
}));

export const BRACKET = {
  r32: [
    ['ARG', 'SUI'], ['NED', 'POL'], ['ESP', 'DEN'], ['BRA', 'AUS'],
    ['FRA', 'CIV'], ['POR', 'EGY'], ['ENG', 'ECU'], ['GER', 'PER'],
    ['BEL', 'KOR'], ['CRO', 'USA'], ['ITA', 'GHA'], ['URU', 'JPN'],
    ['COL', 'NOR'], ['MAR', 'SRB'], ['MEX', 'TUR'], ['SEN', 'SWE'],
  ] as Array<[string, string]>,
};

export const ALERTS = [
  { id: 'a1', type: 'goal', text: 'Mercier scores for France vs Ivory Coast', time: '12m', team: 'FRA' },
  { id: 'a2', type: 'ko', text: 'Spain kickoff in 2h — vs Denmark', time: '2h', team: 'ESP' },
  { id: 'a3', type: 'lineup', text: 'Argentina lineup announced', time: '45m', team: 'ARG' },
  { id: 'a4', type: 'result', text: 'Brazil 2–1 Australia — Full Time', time: '1h', team: 'BRA' },
];

export const FAV_DEFAULTS = { teams: ['ARG', 'ESP'], players: ['P001', 'P007'], matches: [] as string[] };

/** Generate a few plausible events per played match so Match Detail has content. */
function buildMatchEvents(): MatchEvent[] {
  const out: MatchEvent[] = [];
  let seq = 1;
  for (const m of MATCHES) {
    if (m.status === 'UPCOMING' || m.homeGoals == null || m.awayGoals == null) continue;
    const homeScorers = PLAYERS.filter((p) => p.team === m.home && p.pos !== 'GK');
    const awayScorers = PLAYERS.filter((p) => p.team === m.away && p.pos !== 'GK');
    const make = (count: number, teamCode: string, pool: Player[]) => {
      for (let i = 0; i < count; i++) {
        const minute = 5 + Math.floor(seededRand(seq * 4.2 + i) * 85);
        const scorer = pool.length ? pool[Math.floor(seededRand(seq * 9.1 + i) * pool.length)] : null;
        out.push({
          id: 'E' + String(seq).padStart(4, '0'),
          matchId: m.id,
          minute,
          stoppageTime: null,
          team: teamCode,
          player: scorer?.id ?? null,
          type: 'goal',
          description: scorer ? `Goal — ${scorer.name}` : 'Goal',
        });
        seq++;
      }
    };
    make(m.homeGoals, m.home, homeScorers);
    make(m.awayGoals, m.away, awayScorers);
    out.sort((a, b) => (a.matchId === b.matchId ? a.minute - b.minute : 0));
  }
  return out.sort((a, b) => (a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : a.minute - b.minute));
}

export const MATCH_EVENTS: MatchEvent[] = buildMatchEvents();

export const META: CacheMeta = {
  lastSync: 'Mock data · not synced',
  cacheStatus: 'Mock',
  assets: { crests: 0, photos: 0, venues: 0, flags: 0 },
  db: 'worldcup.sqlite (not loaded)',
  sizeMB: 0,
  source: 'mock',
};

export const mockData = {
  teams: TEAMS,
  players: PLAYERS,
  matches: MATCHES,
  venues: VENUES,
  goalkeepers: GOALKEEPERS,
  events: MATCH_EVENTS,
  bracket: BRACKET,
  alerts: ALERTS,
  meta: META,
  today: TODAY,
  groups: GROUPS,
  favDefaults: FAV_DEFAULTS,
};

export type MockData = typeof mockData;
