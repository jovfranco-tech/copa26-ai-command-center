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

export interface TeamStats {
  possession: number;
  shots: number;
  corners: number;
  fouls: number;
}

export interface MatchTimelineEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury' | 'other';
  player: string;
  detail: string;
  team: 'home' | 'away';
}

export interface MatchResultInput {
  /** `null` (or absent) = not played yet → treated as pending, fixture untouched. */
  homeGoals: number | null;
  awayGoals: number | null;
  /** Defaults to 'FT' (full time). Use 'LIVE' to show an in-progress score. */
  status?: 'LIVE' | 'FT';
  /** Only meaningful for 'LIVE'; ignored (nulled) for 'FT'. */
  minute?: number | null;
  possH?: number | null;
  shotsH?: number | null;
  shotsA?: number | null;
  /** Provenance in the live overlay: 'auto' = synced from the feed, 'manual' =
   * set in the admin panel. The auto-sync never overwrites a 'manual' entry. */
  source?: 'auto' | 'manual' | 'gemini-autonomous';
  
  // Advanced AI Extracted Fields
  chronicle?: string;
  mvp?: string;
  teamStats?: {
    home: TeamStats;
    away: TeamStats;
  };
  injuries?: string[]; // Array of player IDs
  formations?: {
    home: string; // e.g. "4-3-3"
    away: string;
  };
  timeline?: MatchTimelineEvent[];
}

export interface ApplyResultsReport {
  matches: Match[];
  applied: string[];
  /** Entries present but with no score yet (null) — expected while filling a template. */
  pending: string[];
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
  const pending: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  // Surface result ids that don't correspond to any fixture, ignoring `_`-prefixed
  // metadata/comment keys (e.g. "_README") used in the template.
  for (const id of Object.keys(results)) {
    if (id.startsWith('_')) continue;
    if (!ids.has(id)) skipped.push({ id, reason: 'matchId inexistente en el calendario' });
  }

  const patched = matches.map((m) => {
    const r = results[m.id];
    if (!r) return m;
    // Placeholder entry (template not filled in yet) — leave the fixture untouched.
    if (r.homeGoals == null || r.awayGoals == null) {
      pending.push(m.id);
      return m;
    }
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
      
      // Copy Advanced AI Extracted Fields
      chronicle: r.chronicle ?? m.chronicle,
      mvp: r.mvp ?? m.mvp,
      teamStats: r.teamStats ?? m.teamStats,
      injuries: r.injuries ?? m.injuries,
      formations: r.formations ?? m.formations,
      timeline: r.timeline ?? m.timeline
    };
  });

  return { matches: patched, applied, pending, skipped };
}
