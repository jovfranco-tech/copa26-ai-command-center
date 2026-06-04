/**
 * Pure, immutable merge of incoming match results into the fixture list.
 *
 * This is the day-1 ingestion primitive: feed it a `{ matchId: result }` map and
 * it returns a NEW matches array with scores applied and status flipped to 'FT'
 * (or 'LIVE'). Standings and per-team goal stats are DERIVED from these matches
 * (see computeStandings / selectors), so once the patched dataset is rebuilt the
 * table, group ranks and goal differentials fill in automatically — no other
 * change required.
 *
 * It never mutates the input, validates every score, and reports anything it
 * skipped (unknown match id, malformed score) instead of throwing, so a partial
 * results feed can be applied safely.
 */
import type { Match } from './types.js';

export interface MatchResultInput {
  homeGoals: number;
  awayGoals: number;
  /** Defaults to 'FT' (full time). Use 'LIVE' to show an in-progress score. */
  status?: 'LIVE' | 'FT';
  /** Only meaningful for 'LIVE'; ignored (nulled) for 'FT'. */
  minute?: number | null;
  possH?: number | null;
  shotsH?: number | null;
  shotsA?: number | null;
}

export interface ApplyResultsReport {
  matches: Match[];
  applied: string[];
  skipped: { id: string; reason: string }[];
}

const isNonNegInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function applyMatchResults(
  matches: Match[],
  results: Record<string, MatchResultInput>,
): ApplyResultsReport {
  const ids = new Set(matches.map((m) => m.id));
  const applied: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  // Surface result ids that don't correspond to any fixture.
  for (const id of Object.keys(results)) {
    if (!ids.has(id)) skipped.push({ id, reason: 'matchId inexistente en el calendario' });
  }

  const patched = matches.map((m) => {
    const r = results[m.id];
    if (!r) return m;
    if (!isNonNegInt(r.homeGoals) || !isNonNegInt(r.awayGoals)) {
      skipped.push({ id: m.id, reason: 'marcador inválido (se esperan enteros ≥ 0)' });
      return m;
    }
    const status = r.status ?? 'FT';
    applied.push(m.id);
    return {
      ...m,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      status,
      minute: status === 'FT' ? null : r.minute ?? null,
      possH: r.possH ?? m.possH ?? null,
      shotsH: r.shotsH ?? m.shotsH ?? null,
      shotsA: r.shotsA ?? m.shotsA ?? null,
    };
  });

  return { matches: patched, applied, skipped };
}
