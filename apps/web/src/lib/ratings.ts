import { knownPlayerRatings } from '@/generated/playerRatings';

export interface PlayerRatings {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  overall: number;
  source: 'fc26' | 'estimate';
  sourceLabel: string;
  providerName?: string;
  providerTeam?: string;
  url?: string;
}

type RatingPlayer = {
  id: string;
  name?: string;
  pos: string;
  team?: string;
  club?: string;
  age?: number | null;
};

type RatingKey = keyof Pick<PlayerRatings, 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical'>;

export type RatingLabel = { key: RatingKey; es: string; short: string };

export const ATTR_LABELS: RatingLabel[] = [
  { key: 'pace', es: 'Velocidad', short: 'VEL' },
  { key: 'shooting', es: 'Tiro', short: 'TIR' },
  { key: 'passing', es: 'Pase', short: 'PAS' },
  { key: 'dribbling', es: 'Regate', short: 'REG' },
  { key: 'defending', es: 'Defensa', short: 'DEF' },
  { key: 'physical', es: 'Físico', short: 'FIS' },
];

export const GK_ATTR_LABELS: RatingLabel[] = [
  { key: 'pace', es: 'Estirada', short: 'EST' },
  { key: 'shooting', es: 'Manejo', short: 'MAN' },
  { key: 'passing', es: 'Saque', short: 'SAQ' },
  { key: 'dribbling', es: 'Reflejos', short: 'REF' },
  { key: 'defending', es: 'Posición', short: 'POS' },
  { key: 'physical', es: 'Físico', short: 'FIS' },
];

export function attrLabelsFor(p: { pos: string }): RatingLabel[] {
  return p.pos === 'GK' ? GK_ATTR_LABELS : ATTR_LABELS;
}

const POS_TEMPLATE: Record<string, Omit<PlayerRatings, 'overall' | 'source' | 'sourceLabel'>> = {
  FW: { pace: 79, shooting: 78, passing: 67, dribbling: 78, defending: 34, physical: 70 },
  MF: { pace: 70, shooting: 67, passing: 78, dribbling: 77, defending: 64, physical: 70 },
  DF: { pace: 68, shooting: 42, passing: 63, dribbling: 60, defending: 78, physical: 78 },
  GK: { pace: 73, shooting: 72, passing: 70, dribbling: 74, defending: 73, physical: 72 },
};

const CLUB_LEVELS: Array<[RegExp, number]> = [
  [/(real madrid|manchester city|fc barcelona|barcelona|psg|bayern|liverpool|arsenal|inter\b|atl[eé]tico madrid)/i, 9],
  [/(chelsea|milan|juventus|tottenham|newcastle|aston villa|porto|benfica|athletic club|leverkusen|napoli|dortmund|roma)/i, 6],
  [/(manchester united|crystal palace|everton|al-nassr|al nassr|al-hilal|al hilal|fenerbah[cç]e|galatasaray|ajax|psv|feyenoord)/i, 4],
  [/(mls|inter miami|monterrey|america|tigres|river|boca|flamengo|palmeiras|santos|olympiacos|celtic|rangers)/i, 2],
];

const TEAM_LEVEL: Record<string, number> = {
  ARG: 8,
  FRA: 8,
  ESP: 8,
  ENG: 8,
  BRA: 8,
  POR: 7,
  NED: 7,
  BEL: 6,
  GER: 7,
  CRO: 6,
  URU: 6,
  COL: 5,
  MEX: 4,
  USA: 4,
  CAN: 3,
  JPN: 4,
  KOR: 4,
  MAR: 4,
  SEN: 4,
  EGY: 3,
  SUI: 5,
  ECU: 4,
  NOR: 5,
  TUR: 4,
  SWE: 4,
  SCO: 3,
  AUT: 4,
  ALG: 3,
  GHA: 3,
  IRN: 3,
  KSA: 2,
  AUS: 2,
  CZE: 4,
  PAR: 3,
  CIV: 3,
};

export function playerRatings(p: RatingPlayer): PlayerRatings {
  const known = knownPlayerRatings[p.id];
  if (known) {
    return {
      overall: known.overall,
      pace: known.pace,
      shooting: known.shooting,
      passing: known.passing,
      dribbling: known.dribbling,
      defending: known.defending,
      physical: known.physical,
      source: 'fc26',
      sourceLabel: 'EA SPORTS FC 26',
      providerName: known.providerName,
      providerTeam: known.providerTeam,
      url: known.url,
    };
  }

  return estimateRatings(p);
}

function estimateRatings(p: RatingPlayer): PlayerRatings {
  const pos = POS_TEMPLATE[p.pos] ? p.pos : 'MF';
  const template = POS_TEMPLATE[pos]!;
  const clubBonus = CLUB_LEVELS.find(([pattern]) => pattern.test(p.club ?? ''))?.[1] ?? 0;
  const teamBonus = TEAM_LEVEL[p.team ?? ''] ?? 0;
  const age = p.age ?? 27;
  const ageAdj = age < 21 ? -2 : age <= 30 ? 2 : age <= 34 ? 0 : -2;
  const overall = clamp(Math.round((pos === 'GK' ? 66 : 65) + clubBonus + teamBonus + ageAdj), 60, 86);
  const lift = overall - 74;
  const withLift = (value: number, extra = 0) => clamp(Math.round(value + lift * 0.65 + extra), 42, 91);

  return {
    overall,
    pace: withLift(template.pace, age < 24 ? 3 : age > 33 ? -5 : 0),
    shooting: withLift(template.shooting, pos === 'FW' ? 3 : 0),
    passing: withLift(template.passing, pos === 'MF' ? 3 : 0),
    dribbling: withLift(template.dribbling, pos === 'FW' || pos === 'MF' ? 2 : 0),
    defending: withLift(template.defending, pos === 'DF' ? 4 : 0),
    physical: withLift(template.physical, age > 29 ? 2 : 0),
    source: 'estimate',
    sourceLabel: 'Estimación por club/selección',
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function attrColor(v: number): string {
  return v >= 78 ? 'var(--pos)' : v >= 62 ? 'var(--warn)' : 'var(--neg)';
}

export function ratingSourceText(r: PlayerRatings): string {
  if (r.source === 'fc26') {
    return r.providerName ? `Base pública FC 26 · ${r.providerName}` : 'Base pública FC 26';
  }
  return 'Estimación cercana · club, selección, edad y posición';
}
