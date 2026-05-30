/**
 * Illustrative, videogame-style player attributes. These are GENERATED
 * deterministically from the player id (biased by position) — they are NOT real
 * ratings and not from any game. Purely a design/visualization device.
 */
export interface PlayerRatings {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  overall: number;
}

function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function val(id: string, attr: string, base: number, spread = 16): number {
  const r = seed(`${id}:${attr}`);
  return Math.round(Math.min(94, Math.max(42, base + (r * 2 - 1) * spread)));
}

const POS_BASE: Record<string, Omit<PlayerRatings, 'overall'>> = {
  FW: { pace: 82, shooting: 82, passing: 68, dribbling: 82, defending: 40, physical: 70 },
  MF: { pace: 72, shooting: 68, passing: 84, dribbling: 80, defending: 66, physical: 70 },
  DF: { pace: 72, shooting: 44, passing: 68, dribbling: 60, defending: 84, physical: 82 },
  GK: { pace: 54, shooting: 24, passing: 60, dribbling: 44, defending: 84, physical: 82 },
};

export function playerRatings(p: { id: string; pos: string }): PlayerRatings {
  const base = POS_BASE[p.pos] ?? POS_BASE.MF!;
  const r: PlayerRatings = {
    pace: val(p.id, 'pace', base.pace),
    shooting: val(p.id, 'shooting', base.shooting),
    passing: val(p.id, 'passing', base.passing),
    dribbling: val(p.id, 'dribbling', base.dribbling),
    defending: val(p.id, 'defending', base.defending),
    physical: val(p.id, 'physical', base.physical),
    overall: 0,
  };
  const sorted = [r.pace, r.shooting, r.passing, r.dribbling, r.defending, r.physical].sort(
    (a, b) => b - a,
  );
  r.overall = Math.round((sorted[0]! * 2 + sorted[1]! * 2 + sorted[2]! + sorted[3]! + sorted[4]! + sorted[5]!) / 8);
  return r;
}

export const ATTR_LABELS: Array<{ key: keyof Omit<PlayerRatings, 'overall'>; es: string; short: string }> = [
  { key: 'pace', es: 'Velocidad', short: 'VEL' },
  { key: 'shooting', es: 'Tiro', short: 'TIR' },
  { key: 'passing', es: 'Pase', short: 'PAS' },
  { key: 'dribbling', es: 'Regate', short: 'REG' },
  { key: 'defending', es: 'Defensa', short: 'DEF' },
  { key: 'physical', es: 'Físico', short: 'FIS' },
];

export function attrColor(v: number): string {
  return v >= 78 ? 'var(--pos)' : v >= 62 ? 'var(--warn)' : 'var(--neg)';
}
