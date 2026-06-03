/**
 * Unit tests for opsIntelligence.ts
 *
 * The module imports types from @/lib/api and @/store/pool, but every function
 * under test is a pure computation — no Firebase, no browser APIs, no React.
 * We supply minimal inline fixtures that satisfy those types structurally.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPoolDiagnostics,
  buildRecommendedPicks,
  evaluateAIStrategyOutcomes,
  comparePickStrategies,
  buildPickChangeHints,
  buildDataReadiness,
  recommendPick,
  buildDayBrief,
} from '../opsIntelligence';

// ---------------------------------------------------------------------------
// Minimal type mirrors (avoids pulling in firebase / zustand / browser APIs)
// ---------------------------------------------------------------------------
type PoolPick = { outcome?: 'home' | 'draw' | 'away'; homeGoals?: number; awayGoals?: number };
type LeaderboardEntry = {
  playerName: string;
  avatarUrl?: string;
  points: number;
  exactScores: number;
  outcomeHits: number;
  efficiency: number;
  predictedCount: number;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeTeam = (code: string, name: string, ranking: number) => ({
  id: code,
  code,
  name,
  group: 'A',
  ranking,
  colorA: '#000000' as `#${string}`,
  colorB: '#ffffff' as `#${string}`,
  flagAssetId: null,
  crestAssetId: null,
});

const makeMatch = (
  id: string,
  home: string,
  away: string,
  status: 'UPCOMING' | 'FT' | 'LIVE',
  date = '2026-06-15',
  homeGoals: number | null = null,
  awayGoals: number | null = null,
) => ({
  id,
  group: 'A',
  stage: 'Group Stage',
  round: 'R1',
  matchday: 1,
  home,
  away,
  homeGoals,
  awayGoals,
  status,
  minute: null,
  date,
  time: '18:00',
  venue: 'MetLife Stadium',
  possH: null,
  shotsH: null,
  shotsA: null,
  shotsTH: null,
  shotsTA: null,
});

// Teams: ARG rank 1 (strong), MAR rank 28 (weaker), ESP rank 8, GER rank 12, BRA rank 5, NED rank 7
const TEAMS = [
  makeTeam('ARG', 'Argentina', 1),
  makeTeam('MAR', 'Morocco', 28),
  makeTeam('ESP', 'Spain', 8),
  makeTeam('GER', 'Germany', 12),
  makeTeam('BRA', 'Brazil', 5),
  makeTeam('NED', 'Netherlands', 7),
  makeTeam('FRA', 'France', 2),
  makeTeam('POR', 'Portugal', 6),
];

// Upcoming matches
const UPCOMING_MATCHES = [
  makeMatch('m1', 'ARG', 'MAR', 'UPCOMING', '2026-06-15'), // ARG rank 1 vs MAR rank 28 → diff 27 → clear edge
  makeMatch('m2', 'ESP', 'GER', 'UPCOMING', '2026-06-16'), // diff 4 → very close → draw pick
  makeMatch('m3', 'BRA', 'NED', 'UPCOMING', '2026-06-17'), // diff 2 → very close → draw pick
  makeMatch('m4', 'FRA', 'POR', 'UPCOMING', '2026-06-18'), // FRA 2 vs POR 6 → diff 4 → close → draw
];

// Finished matches
const FT_MATCHES = [
  makeMatch('f1', 'ARG', 'MAR', 'FT', '2026-06-01', 2, 0), // ARG wins
  makeMatch('f2', 'ESP', 'GER', 'FT', '2026-06-02', 1, 1), // draw
  makeMatch('f3', 'BRA', 'NED', 'FT', '2026-06-03', 0, 1), // NED wins
];

// ---------------------------------------------------------------------------
// recommendPick
// ---------------------------------------------------------------------------
describe('recommendPick', () => {
  it('returns draw pick when ranking difference is ≤ 4', () => {
    const match = makeMatch('t1', 'ESP', 'GER', 'UPCOMING'); // diff = 12-8 = 4
    const rec = recommendPick(match, TEAMS);
    expect(rec.pick.outcome).toBe('draw');
    expect(rec.confidence).toBe('Baja');
  });

  it('returns home win with high confidence when home rank is much better (diff ≥ 18)', () => {
    const match = makeMatch('t2', 'ARG', 'MAR', 'UPCOMING'); // diff = 28-1 = 27
    const rec = recommendPick(match, TEAMS);
    expect(rec.pick.outcome).toBe('home');
    expect(rec.confidence).toBe('Alta');
    expect(rec.pick.homeGoals).toBe(2);
    expect(rec.pick.awayGoals).toBe(0);
  });

  it('returns away win when away team has better ranking and diff ≥ 18', () => {
    // away rank 1 (ARG) vs home rank 28 (MAR) → diff = 1-28 = -27 → awayRank-homeRank = 1-28 = -27 < 0 → away better? No...
    // Let's use a match where away is clearly better: home=MAR(28), away=ARG(1)
    // diff = awayRank - homeRank = 1 - 28 = -27 → homeBetter = diff>0 → false → awayBetter
    const match = makeMatch('t3', 'MAR', 'ARG', 'UPCOMING');
    const rec = recommendPick(match, TEAMS);
    expect(rec.pick.outcome).toBe('away');
    expect(rec.confidence).toBe('Alta');
    expect(rec.pick.homeGoals).toBe(0);
    expect(rec.pick.awayGoals).toBe(2);
  });

  it('returns medium confidence when home is better but diff < 18', () => {
    // FRA(2) vs NED(7): diff = 7-2 = 5 → homeBetter, clearEdge=false
    const match = makeMatch('t4', 'FRA', 'NED', 'UPCOMING');
    const rec = recommendPick(match, TEAMS);
    expect(rec.pick.outcome).toBe('home');
    expect(rec.confidence).toBe('Media');
    expect(rec.pick.homeGoals).toBe(1);
    expect(rec.pick.awayGoals).toBe(0);
  });

  it('includes team name in label', () => {
    const match = makeMatch('t5', 'ARG', 'MAR', 'UPCOMING');
    const rec = recommendPick(match, TEAMS);
    expect(rec.label).toContain('Argentina');
  });

  it('uses code as fallback name when team not found', () => {
    const match = makeMatch('t6', 'XYZ', 'ABC', 'UPCOMING');
    const rec = recommendPick(match, TEAMS);
    // Unknown teams have ranking 80 each → diff = 0 → draw
    expect(rec.pick.outcome).toBe('draw');
  });
});

// ---------------------------------------------------------------------------
// buildRecommendedPicks
// ---------------------------------------------------------------------------
describe('buildRecommendedPicks', () => {
  it('returns a record keyed by match id for upcoming matches', () => {
    const picks = buildRecommendedPicks(UPCOMING_MATCHES, TEAMS);
    expect(Object.keys(picks)).toContain('m1');
    expect(Object.keys(picks)).toContain('m2');
    // Every entry must be a valid PoolPick shape
    for (const pick of Object.values(picks)) {
      expect(pick).toHaveProperty('outcome');
    }
  });

  it('does not include finished matches', () => {
    const allMatches = [...UPCOMING_MATCHES, ...FT_MATCHES];
    const picks = buildRecommendedPicks(allMatches, TEAMS);
    expect(Object.keys(picks)).not.toContain('f1');
    expect(Object.keys(picks)).not.toContain('f2');
  });

  it('respects the limit parameter', () => {
    const picks = buildRecommendedPicks(UPCOMING_MATCHES, TEAMS, 2);
    expect(Object.keys(picks).length).toBe(2);
  });

  it('returns empty object when no upcoming matches', () => {
    const picks = buildRecommendedPicks(FT_MATCHES, TEAMS);
    expect(Object.keys(picks).length).toBe(0);
  });

  it('sorts by date/time before slicing', () => {
    // m1 is 06-15, m2 is 06-16 — so with limit=1 only m1 should appear
    const picks = buildRecommendedPicks(UPCOMING_MATCHES, TEAMS, 1);
    expect(Object.keys(picks)).toContain('m1');
    expect(Object.keys(picks)).not.toContain('m2');
  });
});

// ---------------------------------------------------------------------------
// evaluateAIStrategyOutcomes
// ---------------------------------------------------------------------------
describe('evaluateAIStrategyOutcomes', () => {
  it('returns zero played when no finished matches', () => {
    const scorecard = evaluateAIStrategyOutcomes(UPCOMING_MATCHES, TEAMS);
    expect(scorecard.played).toBe(0);
    expect(scorecard.bestLabel).toBe('Esperando resultados');
  });

  it('counts finished matches correctly', () => {
    const scorecard = evaluateAIStrategyOutcomes(FT_MATCHES, TEAMS);
    expect(scorecard.played).toBe(3);
  });

  it('returns 3 strategy rows', () => {
    const scorecard = evaluateAIStrategyOutcomes(FT_MATCHES, TEAMS);
    expect(scorecard.strategies).toHaveLength(3);
    const ids = scorecard.strategies.map((s) => s.strategy);
    expect(ids).toContain('conservative');
    expect(ids).toContain('aggressive');
    expect(ids).toContain('contrarian');
  });

  it('each strategy row has non-negative points and valid efficiency (0-100)', () => {
    const scorecard = evaluateAIStrategyOutcomes(FT_MATCHES, TEAMS);
    for (const row of scorecard.strategies) {
      expect(row.points).toBeGreaterThanOrEqual(0);
      expect(row.efficiency).toBeGreaterThanOrEqual(0);
      expect(row.efficiency).toBeLessThanOrEqual(100);
      expect(row.exactScores + row.outcomeHits + row.misses).toBe(3);
    }
  });

  it('bestLabel includes strategy name and points when matches played', () => {
    const scorecard = evaluateAIStrategyOutcomes(FT_MATCHES, TEAMS);
    expect(scorecard.bestLabel).toMatch(/·\s*\d+\s*pts/);
  });

  it('summary mentions match count', () => {
    const scorecard = evaluateAIStrategyOutcomes(FT_MATCHES, TEAMS);
    expect(scorecard.summary).toContain('3');
  });

  it('conservative strategy gives +3 for exact score, +1 for correct outcome', () => {
    // ARG(1) vs MAR(28): diff=27 → conservative picks home 2-0
    // Test match where real score is exactly 2-0: should get +3
    const exactMatch = makeMatch('e1', 'ARG', 'MAR', 'FT', '2026-06-01', 2, 0);
    const scorecard = evaluateAIStrategyOutcomes([exactMatch], TEAMS);
    const cons = scorecard.strategies.find((s) => s.strategy === 'conservative')!;
    expect(cons.exactScores).toBe(1);
    expect(cons.points).toBe(3);
  });

  it('conservative strategy gives +1 for correct outcome but wrong score', () => {
    // ARG(1) vs MAR(28): conservative picks home 2-0; real = 3-1 → home win, not exact
    const outcomeMatch = makeMatch('e2', 'ARG', 'MAR', 'FT', '2026-06-01', 3, 1);
    const scorecard = evaluateAIStrategyOutcomes([outcomeMatch], TEAMS);
    const cons = scorecard.strategies.find((s) => s.strategy === 'conservative')!;
    expect(cons.outcomeHits).toBe(1);
    expect(cons.exactScores).toBe(0);
    expect(cons.points).toBe(1);
  });

  it('strategy gives 0 points for wrong outcome', () => {
    // ARG(1) vs MAR(28): conservative picks home 2-0; real = 0-1 → away win → miss
    const wrongMatch = makeMatch('e3', 'ARG', 'MAR', 'FT', '2026-06-01', 0, 1);
    const scorecard = evaluateAIStrategyOutcomes([wrongMatch], TEAMS);
    const cons = scorecard.strategies.find((s) => s.strategy === 'conservative')!;
    expect(cons.misses).toBe(1);
    expect(cons.points).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildPoolDiagnostics
// ---------------------------------------------------------------------------
describe('buildPoolDiagnostics', () => {
  const fullPicks: Record<string, PoolPick> = {
    m1: { outcome: 'home', homeGoals: 2, awayGoals: 0 },
    m2: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
    m3: { outcome: 'away', homeGoals: 0, awayGoals: 1 },
    m4: { outcome: 'draw', homeGoals: 0, awayGoals: 0 },
  };

  it('calculates totalPending as number of UPCOMING matches', () => {
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {});
    expect(diag.totalPending).toBe(4);
  });

  it('calculates 100% coverage when all upcoming matches are picked', () => {
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, fullPicks);
    expect(diag.pickedPending).toBe(4);
    expect(diag.coveragePct).toBe(100);
  });

  it('calculates 0% coverage when no picks exist', () => {
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {});
    expect(diag.pickedPending).toBe(0);
    expect(diag.coveragePct).toBe(0);
  });

  it('calculates completeScores correctly (picks with both goals)', () => {
    const partial: Record<string, PoolPick> = {
      m1: { outcome: 'home', homeGoals: 2, awayGoals: 0 },
      m2: { outcome: 'draw' }, // no goals
    };
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, partial);
    expect(diag.completeScores).toBe(1);
    expect(diag.scorePct).toBe(25); // 1/4
  });

  it('missingWinner + pickedPending equals totalPending', () => {
    const partial: Record<string, PoolPick> = {
      m1: { outcome: 'home', homeGoals: 2, awayGoals: 0 },
    };
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, partial);
    expect(diag.pickedPending + diag.missingWinner).toBe(diag.totalPending);
  });

  it('sets leaderLabel to sentinel when no leaderboard', () => {
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {}, []);
    expect(diag.leaderLabel).toBe('Sin tabla todavía');
  });

  it('uses first human entry as leaderLabel', () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerName: 'Alice', points: 42, exactScores: 5, outcomeHits: 8, efficiency: 65, predictedCount: 20 },
      { playerName: 'Bob', points: 38, exactScores: 3, outcomeHits: 9, efficiency: 60, predictedCount: 20 },
    ];
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {}, leaderboard);
    expect(diag.leaderLabel).toContain('Alice');
    expect(diag.leaderLabel).toContain('42');
  });

  it('skips AI entries when looking for human leader', () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerName: 'IA · Conservadora', points: 50, exactScores: 8, outcomeHits: 6, efficiency: 70, predictedCount: 20 },
      { playerName: 'Bob', points: 38, exactScores: 3, outcomeHits: 9, efficiency: 60, predictedCount: 20 },
    ];
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {}, leaderboard);
    expect(diag.leaderLabel).toContain('Bob');
    expect(diag.leaderLabel).toContain('38');
  });

  it('includes user row info in familySignal when playerName matches', () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerName: 'Alice', points: 20, exactScores: 2, outcomeHits: 3, efficiency: 55, predictedCount: 10 },
    ];
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, {}, leaderboard, 'Alice');
    expect(diag.familySignal).toContain('20 pts');
  });

  it('recommends completing winners when coverage < 80%', () => {
    // 1 out of 4 picks = 25% coverage
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, { m1: { outcome: 'home' } });
    expect(diag.recommendedAction).toContain('ganadores');
  });

  it('recommends closing scores when coverage ≥ 80% but scorePct < 80%', () => {
    const picksWithOutcomesOnly: Record<string, PoolPick> = {
      m1: { outcome: 'home' },
      m2: { outcome: 'draw' },
      m3: { outcome: 'away' },
      m4: { outcome: 'draw' },
    };
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, picksWithOutcomesOnly);
    expect(diag.coveragePct).toBe(100);
    expect(diag.scorePct).toBe(0);
    expect(diag.recommendedAction).toContain('marcadores');
  });

  it('sets style to Agresivo when average goals ≥ 3.2 across ≥ 3 scored picks', () => {
    // avg = (3+0+3+1+4+0)/3 scored... let's use 4 picks each with high goals
    const aggressivePicks: Record<string, PoolPick> = {
      m1: { outcome: 'home', homeGoals: 4, awayGoals: 0 }, // 4 goals
      m2: { outcome: 'away', homeGoals: 0, awayGoals: 4 }, // 4 goals
      m3: { outcome: 'home', homeGoals: 3, awayGoals: 1 }, // 4 goals
    };
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, aggressivePicks);
    expect(diag.styleLabel).toBe('Agresivo');
  });

  it('sets style to Conservador de empates when draw share ≥ 30%', () => {
    const drawPicks: Record<string, PoolPick> = {
      m1: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
      m2: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
      m3: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
      m4: { outcome: 'home', homeGoals: 2, awayGoals: 0 },
    };
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, drawPicks);
    expect(diag.styleLabel).toBe('Conservador de empates');
  });

  it('sets style to Perfil por definir when fewer than 3 scored picks', () => {
    const diag = buildPoolDiagnostics(UPCOMING_MATCHES, { m1: { outcome: 'home', homeGoals: 2, awayGoals: 0 } });
    expect(diag.styleLabel).toBe('Perfil por definir');
  });

  it('returns 100% coverage when there are no upcoming matches', () => {
    const diag = buildPoolDiagnostics(FT_MATCHES, {});
    expect(diag.totalPending).toBe(0);
    expect(diag.coveragePct).toBe(100);
    expect(diag.scorePct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// comparePickStrategies
// ---------------------------------------------------------------------------
describe('comparePickStrategies', () => {
  it('returns 3 strategy previews', () => {
    const previews = comparePickStrategies(UPCOMING_MATCHES, TEAMS);
    expect(previews).toHaveLength(3);
  });

  it('each preview has the correct strategy id', () => {
    const previews = comparePickStrategies(UPCOMING_MATCHES, TEAMS);
    const ids = previews.map((p) => p.strategy);
    expect(ids).toContain('conservative');
    expect(ids).toContain('aggressive');
    expect(ids).toContain('contrarian');
  });

  it('includes picks array for each strategy', () => {
    const previews = comparePickStrategies(UPCOMING_MATCHES, TEAMS, 3);
    for (const preview of previews) {
      expect(preview.picks).toHaveLength(3);
      for (const pick of preview.picks) {
        expect(pick).toHaveProperty('matchId');
        expect(pick).toHaveProperty('prediction');
        expect(pick).toHaveProperty('rationale');
      }
    }
  });

  it('returns empty picks when no upcoming matches', () => {
    const previews = comparePickStrategies(FT_MATCHES, TEAMS);
    for (const preview of previews) {
      expect(preview.picks).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildPickChangeHints
// ---------------------------------------------------------------------------
describe('buildPickChangeHints', () => {
  it('returns empty array when picks match recommendations', () => {
    // Get the actual recommended picks so there's nothing to change
    const recommended = buildRecommendedPicks(UPCOMING_MATCHES, TEAMS);
    const hints = buildPickChangeHints(UPCOMING_MATCHES, TEAMS, recommended);
    expect(hints).toHaveLength(0);
  });

  it('returns hints when current picks differ from recommendations', () => {
    // Force all picks to be away-win, but some recommendations will be different
    const forcedPicks: Record<string, PoolPick> = {
      m1: { outcome: 'draw', homeGoals: 1, awayGoals: 1 }, // recommendation for m1 is 'home' → different
    };
    const hints = buildPickChangeHints(UPCOMING_MATCHES, TEAMS, forcedPicks);
    expect(hints.length).toBeGreaterThan(0);
    const hint = hints[0];
    expect(hint).toHaveProperty('matchId');
    expect(hint).toHaveProperty('current');
    expect(hint).toHaveProperty('recommended');
  });

  it('skips matches with no existing pick', () => {
    // No picks at all → nothing to hint about
    const hints = buildPickChangeHints(UPCOMING_MATCHES, TEAMS, {});
    expect(hints).toHaveLength(0);
  });

  it('respects limit parameter', () => {
    const allDifferent: Record<string, PoolPick> = {
      m1: { outcome: 'draw', homeGoals: 0, awayGoals: 0 }, // rec is 'home'
      m2: { outcome: 'home', homeGoals: 3, awayGoals: 0 }, // rec might be 'draw'
      m3: { outcome: 'home', homeGoals: 3, awayGoals: 0 },
      m4: { outcome: 'away', homeGoals: 0, awayGoals: 3 },
    };
    const hints = buildPickChangeHints(UPCOMING_MATCHES, TEAMS, allDifferent, 2);
    expect(hints.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// buildDataReadiness
// ---------------------------------------------------------------------------
describe('buildDataReadiness', () => {
  it('returns ok status and high score when everything is fully configured', () => {
    const result = buildDataReadiness({
      teams: 48,
      matches: 104,
      players: 736,
      venues: 16,
      estimatedRatings: 0,
      resultsSource: 'configured',
      poolDurable: true,
      aiConfigured: true,
    });
    expect(result.status).toBe('ok');
    expect(result.score).toBeGreaterThanOrEqual(88);
    expect(result.label).toBe('Listo para compartir');
  });

  it('returns warn status when most items are missing', () => {
    const result = buildDataReadiness({
      teams: 0,
      matches: 0,
      players: 0,
      venues: 0,
      estimatedRatings: 100,
      resultsSource: 'pending',
      poolDurable: false,
      aiConfigured: false,
    });
    expect(result.status).toBe('warn');
    expect(result.score).toBeLessThan(70);
    expect(result.label).toBe('Requiere revisión');
  });

  it('returns 6 checks always', () => {
    const result = buildDataReadiness({ teams: 48, matches: 104, players: 400, venues: 20, estimatedRatings: 0 });
    expect(result.checks).toHaveLength(6);
  });

  it('nextActions is non-empty when there are pending items', () => {
    const result = buildDataReadiness({
      teams: 10,
      matches: 20,
      players: 50,
      venues: 5,
      estimatedRatings: 60,
      resultsSource: 'pending',
      poolDurable: false,
      aiConfigured: false,
    });
    expect(result.nextActions.length).toBeGreaterThan(0);
  });

  it('calendar check is ok when matches ≥ 100 and teams ≥ 48', () => {
    const result = buildDataReadiness({ teams: 48, matches: 100, players: 200, venues: 16, estimatedRatings: 0 });
    const cal = result.checks.find((c) => c.id === 'calendar')!;
    expect(cal.status).toBe('ok');
  });

  it('calendar check is warn when matches < 100', () => {
    const result = buildDataReadiness({ teams: 48, matches: 50, players: 200, venues: 16, estimatedRatings: 0 });
    const cal = result.checks.find((c) => c.id === 'calendar')!;
    expect(cal.status).toBe('warn');
  });

  it('ratings check is ok when estimatedRatings === 0', () => {
    const result = buildDataReadiness({ teams: 48, matches: 100, players: 200, venues: 16, estimatedRatings: 0 });
    const ratings = result.checks.find((c) => c.id === 'ratings')!;
    expect(ratings.status).toBe('ok');
  });

  it('ratings check is info when estimatedRatings ≤ 48', () => {
    const result = buildDataReadiness({ teams: 48, matches: 100, players: 200, venues: 16, estimatedRatings: 20 });
    const ratings = result.checks.find((c) => c.id === 'ratings')!;
    expect(ratings.status).toBe('info');
  });

  it('ai check is info when aiConfigured is false', () => {
    const result = buildDataReadiness({ teams: 48, matches: 100, players: 200, venues: 16, estimatedRatings: 0, aiConfigured: false });
    const ai = result.checks.find((c) => c.id === 'ai')!;
    expect(ai.status).toBe('info');
  });
});

// ---------------------------------------------------------------------------
// buildDayBrief
// ---------------------------------------------------------------------------
describe('buildDayBrief', () => {
  it('returns fallback brief when no upcoming matches', () => {
    const brief = buildDayBrief(FT_MATCHES, TEAMS, {});
    expect(brief.title).toBe('Sin partidos pendientes');
    expect(brief.nextAction).toContain('Centro de datos');
  });

  it('returns the next upcoming match as title', () => {
    const brief = buildDayBrief(UPCOMING_MATCHES, TEAMS, {});
    // First upcoming match sorted by date is m1 (2026-06-15): ARG vs MAR
    expect(brief.title).toContain('Argentina');
    expect(brief.title).toContain('Morocco');
  });

  it('subtitle includes date and venue', () => {
    const brief = buildDayBrief(UPCOMING_MATCHES, TEAMS, {});
    expect(brief.subtitle).toContain('2026-06-15');
    expect(brief.subtitle).toContain('MetLife Stadium');
  });

  it('nextAction prompts to complete picks when picks are missing', () => {
    const brief = buildDayBrief(UPCOMING_MATCHES, TEAMS, {});
    expect(brief.nextAction).toContain('Completar picks');
  });

  it('nextAction prompts to review when all day picks are complete', () => {
    // All matches on 2026-06-15 (only m1) are picked
    const allPicked: Record<string, PoolPick> = {
      m1: { outcome: 'home', homeGoals: 2, awayGoals: 0 },
    };
    const brief = buildDayBrief(UPCOMING_MATCHES, TEAMS, allPicked);
    expect(brief.nextAction).toContain('Revisar');
  });

  it('highlights array has 4 items', () => {
    const brief = buildDayBrief(UPCOMING_MATCHES, TEAMS, {});
    expect(brief.highlights).toHaveLength(4);
  });
});
