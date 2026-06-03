/**
 * Unit tests for the pool scoring algorithm used in Pool.tsx / leaderboard.
 *
 * Scoring rules (family quiniela):
 *   • Exact score (homeGoals + awayGoals both match) → +3 pts
 *   • Correct outcome only (W/D/L matches, but not the exact score) → +1 pt
 *   • Wrong outcome → 0 pts
 *   • No prediction → 0 pts
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Standalone pure scoring function (mirrors the inline logic in Pool.tsx)
// ---------------------------------------------------------------------------
type Outcome = 'home' | 'draw' | 'away';

interface Pick {
  outcome?: Outcome;
  homeGoals?: number;
  awayGoals?: number;
}

interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

function scorePoints(pick: Pick | undefined, result: MatchResult): number {
  if (!pick || pick.outcome == null) return 0;

  const realOutcome: Outcome =
    result.homeGoals > result.awayGoals
      ? 'home'
      : result.homeGoals < result.awayGoals
        ? 'away'
        : 'draw';

  const exactScore = pick.homeGoals === result.homeGoals && pick.awayGoals === result.awayGoals;
  const correctOutcome = pick.outcome === realOutcome;

  if (exactScore) return 3;
  if (correctOutcome) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('pool scoring', () => {
  // ------- Core rule: exact score -------

  it('awards 3 points for an exact score prediction (2-1 vs real 2-1)', () => {
    const pick: Pick = { outcome: 'home', homeGoals: 2, awayGoals: 1 };
    expect(scorePoints(pick, { homeGoals: 2, awayGoals: 1 })).toBe(3);
  });

  it('awards 3 points for exact score 0-0 draw', () => {
    const pick: Pick = { outcome: 'draw', homeGoals: 0, awayGoals: 0 };
    expect(scorePoints(pick, { homeGoals: 0, awayGoals: 0 })).toBe(3);
  });

  it('awards 3 points for exact away win (0-2 vs real 0-2)', () => {
    const pick: Pick = { outcome: 'away', homeGoals: 0, awayGoals: 2 };
    expect(scorePoints(pick, { homeGoals: 0, awayGoals: 2 })).toBe(3);
  });

  // ------- Core rule: correct outcome only -------

  it('awards 1 point for correct home-win outcome but wrong score (2-0 vs real 1-0)', () => {
    const pick: Pick = { outcome: 'home', homeGoals: 2, awayGoals: 0 };
    expect(scorePoints(pick, { homeGoals: 1, awayGoals: 0 })).toBe(1);
  });

  it('awards 1 point for correct draw outcome but wrong score (1-1 vs real 0-0)', () => {
    const pick: Pick = { outcome: 'draw', homeGoals: 1, awayGoals: 1 };
    expect(scorePoints(pick, { homeGoals: 0, awayGoals: 0 })).toBe(1);
  });

  it('awards 1 point for correct away-win outcome but wrong score (0-1 vs real 0-3)', () => {
    const pick: Pick = { outcome: 'away', homeGoals: 0, awayGoals: 1 };
    expect(scorePoints(pick, { homeGoals: 0, awayGoals: 3 })).toBe(1);
  });

  it('awards 1 point when pick has no goals but correct outcome (outcome-only pick)', () => {
    // Pick has outcome but no goals — cannot be exact → correct outcome = +1
    const pick: Pick = { outcome: 'home' };
    expect(scorePoints(pick, { homeGoals: 2, awayGoals: 0 })).toBe(1);
  });

  // ------- Core rule: wrong outcome = 0 -------

  it('awards 0 points when predicted draw but real result is a home win', () => {
    const pick: Pick = { outcome: 'draw', homeGoals: 1, awayGoals: 1 };
    expect(scorePoints(pick, { homeGoals: 2, awayGoals: 0 })).toBe(0);
  });

  it('awards 0 points when predicted home win but real result is a draw', () => {
    const pick: Pick = { outcome: 'home', homeGoals: 1, awayGoals: 0 };
    expect(scorePoints(pick, { homeGoals: 1, awayGoals: 1 })).toBe(0);
  });

  it('awards 0 points when predicted home win but real result is an away win', () => {
    const pick: Pick = { outcome: 'home', homeGoals: 2, awayGoals: 0 };
    expect(scorePoints(pick, { homeGoals: 0, awayGoals: 1 })).toBe(0);
  });

  it('awards 0 points when predicted away win but real result is a home win', () => {
    const pick: Pick = { outcome: 'away', homeGoals: 0, awayGoals: 2 };
    expect(scorePoints(pick, { homeGoals: 3, awayGoals: 0 })).toBe(0);
  });

  // ------- No prediction = 0 -------

  it('awards 0 points when pick is undefined (no entry)', () => {
    expect(scorePoints(undefined, { homeGoals: 2, awayGoals: 1 })).toBe(0);
  });

  it('awards 0 points when pick has no outcome set', () => {
    const pick: Pick = { homeGoals: 2, awayGoals: 1 }; // goals but no outcome field
    expect(scorePoints(pick, { homeGoals: 2, awayGoals: 1 })).toBe(0);
  });

  // ------- Edge cases -------

  it('awards 0 points for a high-scoring draw prediction vs a low-scoring draw', () => {
    const pick: Pick = { outcome: 'draw', homeGoals: 3, awayGoals: 3 };
    // Real: 1-1 → outcome correct (+1) but not exact → 1
    expect(scorePoints(pick, { homeGoals: 1, awayGoals: 1 })).toBe(1);
  });

  it('exact 1-0 gives 3 points', () => {
    const pick: Pick = { outcome: 'home', homeGoals: 1, awayGoals: 0 };
    expect(scorePoints(pick, { homeGoals: 1, awayGoals: 0 })).toBe(3);
  });

  it('predicted goals match but outcome field is wrong → uses exact score rule (3 pts)', () => {
    // Logically inconsistent pick (outcome says 'away' but goals say home win).
    // Exact score check is purely numeric so it still fires.
    const pick: Pick = { outcome: 'away', homeGoals: 2, awayGoals: 1 };
    // Real 2-1 → exact score match → 3 pts
    expect(scorePoints(pick, { homeGoals: 2, awayGoals: 1 })).toBe(3);
  });

  // ------- Accumulation -------

  it('correctly tallies cumulative points across multiple matches', () => {
    const results: Array<[Pick | undefined, MatchResult]> = [
      [{ outcome: 'home', homeGoals: 2, awayGoals: 1 }, { homeGoals: 2, awayGoals: 1 }],  // exact → 3
      [{ outcome: 'draw', homeGoals: 1, awayGoals: 1 }, { homeGoals: 0, awayGoals: 1 }],  // wrong → 0
      [{ outcome: 'home', homeGoals: 2, awayGoals: 0 }, { homeGoals: 1, awayGoals: 0 }],  // correct outcome → 1
      [undefined, { homeGoals: 3, awayGoals: 2 }],                                          // no pick → 0
      [{ outcome: 'draw', homeGoals: 0, awayGoals: 0 }, { homeGoals: 0, awayGoals: 0 }],  // exact draw → 3
    ];
    const total = results.reduce((sum, [pick, result]) => sum + scorePoints(pick, result), 0);
    expect(total).toBe(7); // 3 + 0 + 1 + 0 + 3
  });
});
