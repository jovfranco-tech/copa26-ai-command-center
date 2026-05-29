/**
 * Standings are DERIVED from finished matches, never trusted blindly.
 * 3 pts win / 1 pt draw. Tiebreak: Pts -> GD -> GF.
 * (Ported verbatim from the approved prototype's computeStandings/groupTable.)
 */
import type { Match, StandingRow, Team } from './types.js';

export function computeStandings(teams: Team[], matches: Match[]): Record<string, StandingRow> {
  const table: Record<string, StandingRow> = {};
  for (const t of teams) {
    table[t.code] = {
      team: t.code,
      group: t.group,
      P: 0,
      W: 0,
      D: 0,
      L: 0,
      GF: 0,
      GA: 0,
      GD: 0,
      Pts: 0,
      form: [],
    };
  }

  for (const m of matches) {
    if (m.status !== 'FT' || m.homeGoals == null || m.awayGoals == null) continue;
    const h = table[m.home];
    const a = table[m.away];
    if (!h || !a) continue;

    h.P++;
    a.P++;
    h.GF += m.homeGoals;
    h.GA += m.awayGoals;
    a.GF += m.awayGoals;
    a.GA += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      h.W++;
      a.L++;
      h.Pts += 3;
      h.form.push('W');
      a.form.push('L');
    } else if (m.homeGoals < m.awayGoals) {
      a.W++;
      h.L++;
      a.Pts += 3;
      a.form.push('W');
      h.form.push('L');
    } else {
      h.D++;
      a.D++;
      h.Pts++;
      a.Pts++;
      h.form.push('D');
      a.form.push('D');
    }
  }

  for (const r of Object.values(table)) {
    r.GD = r.GF - r.GA;
  }
  return table;
}

/** Sorted rows for a single group, with `rank` filled in (1-based). */
export function groupTable(
  letter: string,
  standings: Record<string, StandingRow>,
): StandingRow[] {
  return Object.values(standings)
    .filter((r) => r.group === letter)
    .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** All groups, sorted, keyed by letter. */
export function allGroupTables(
  groupLetters: string[],
  standings: Record<string, StandingRow>,
): Record<string, StandingRow[]> {
  const out: Record<string, StandingRow[]> = {};
  for (const g of groupLetters) out[g] = groupTable(g, standings);
  return out;
}
