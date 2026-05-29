/** Pure, source-agnostic query helpers used by both the local API and the UI. */
import type { Match, Player, StatsBundle, Team } from './types.js';

export function topScorers(players: Player[], n = 10): Player[] {
  return [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, n);
}

export function topAssists(players: Player[], n = 10): Player[] {
  return [...players].sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, n);
}

export function topCards(players: Player[], n = 10): Player[] {
  return [...players]
    .sort((a, b) => b.red * 2 + b.yellow - (a.red * 2 + a.yellow) || b.yellow - a.yellow)
    .slice(0, n);
}

export function matchesByDate(matches: Match[], dateStr: string): Match[] {
  return matches.filter((m) => m.date === dateStr);
}

export function playersByTeam(players: Player[], code: string): Player[] {
  return players.filter((p) => p.team === code);
}

export function teamGoalsFor(players: Player[], code: string): number {
  return playersByTeam(players, code).reduce((sum, p) => sum + p.goals, 0);
}

/** Next non-finished match for a team (used by team cards). */
export function nextMatchFor(matches: Match[], code: string): Match | undefined {
  return matches.find((m) => (m.home === code || m.away === code) && m.status !== 'FT');
}

export function matchesForTeam(matches: Match[], code: string): Match[] {
  return matches.filter((m) => m.home === code || m.away === code);
}

/** Build the aggregate payload that powers the Stats screen. */
export function buildStats(
  teams: Team[],
  players: Player[],
  matches: Match[],
  goalkeepers: StatsBundle['goalkeepers'],
  source: StatsBundle['source'],
): StatsBundle {
  const teamGoals = teams
    .map((t) => ({ team: t.code, goals: teamGoalsFor(players, t.code) }))
    .sort((a, b) => b.goals - a.goals);

  const possAcc: Record<string, { total: number; count: number }> = {};
  const shotsAcc: Record<string, number> = {};
  for (const m of matches) {
    if (m.status === 'UPCOMING') continue;
    if (m.possH != null) {
      (possAcc[m.home] ??= { total: 0, count: 0 }).total += m.possH;
      possAcc[m.home]!.count += 1;
      (possAcc[m.away] ??= { total: 0, count: 0 }).total += 100 - m.possH;
      possAcc[m.away]!.count += 1;
    }
    if (m.shotsH != null) shotsAcc[m.home] = (shotsAcc[m.home] ?? 0) + m.shotsH;
    if (m.shotsA != null) shotsAcc[m.away] = (shotsAcc[m.away] ?? 0) + m.shotsA;
  }

  const teamPossession = Object.entries(possAcc)
    .map(([team, v]) => ({ team, possession: Math.round(v.total / Math.max(1, v.count)) }))
    .sort((a, b) => b.possession - a.possession);

  const teamShots = Object.entries(shotsAcc)
    .map(([team, shots]) => ({ team, shots }))
    .sort((a, b) => b.shots - a.shots);

  return {
    source,
    topScorers: topScorers(players, 12),
    topAssists: topAssists(players, 12),
    topCards: topCards(players, 12),
    goalkeepers: [...goalkeepers].sort((a, b) => b.saves - a.saves),
    teamGoals,
    teamPossession,
    teamShots,
  };
}
