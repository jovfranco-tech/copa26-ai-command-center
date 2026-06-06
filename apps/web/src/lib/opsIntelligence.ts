import type { Match, Team } from '@worldcup/shared';
import type { LeaderboardEntry } from '@/lib/api';
import type { PoolPick } from '@/store/pool';
import { tEs, type Translate } from '@/i18n';

export type OpsTone = 'ok' | 'warn' | 'info';
const AI_AGENT_PREFIX = 'IA ·';

export interface RecommendedPick {
  pick: PoolPick;
  label: string;
  confidence: 'Alta' | 'Media' | 'Baja';
  rationale: string;
  risk: string;
}

export interface PoolDiagnostics {
  totalPending: number;
  pickedPending: number;
  completeScores: number;
  missingWinner: number;
  missingScore: number;
  coveragePct: number;
  scorePct: number;
  styleLabel: string;
  styleDetail: string;
  leaderLabel: string;
  familySignal: string;
  recommendedAction: string;
}

export interface DataReadinessInput {
  teams: number;
  matches: number;
  players: number;
  venues: number;
  estimatedRatings: number;
  resultsSource?: string;
  poolDurable?: boolean;
  aiConfigured?: boolean;
  errors?: number;
}

export interface DataReadiness {
  score: number;
  label: string;
  status: OpsTone;
  checks: Array<{
    id: string;
    label: string;
    status: OpsTone;
    detail: string;
  }>;
  nextActions: string[];
}

export interface DayBrief {
  title: string;
  subtitle: string;
  highlights: string[];
  nextAction: string;
}

export type PickStrategyId = 'conservative' | 'aggressive' | 'contrarian';

export interface StrategyPreview {
  strategy: PickStrategyId;
  label: string;
  summary: string;
  risk: string;
  confidence: 'Alta' | 'Media' | 'Baja';
  picks: Array<{
    matchId: string;
    matchLabel: string;
    prediction: string;
    rationale: string;
  }>;
}

export interface StrategyScorecard {
  played: number;
  summary: string;
  bestLabel: string;
  strategies: Array<{
    strategy: PickStrategyId;
    label: string;
    points: number;
    exactScores: number;
    outcomeHits: number;
    misses: number;
    efficiency: number;
  }>;
}

export interface PickChangeHint {
  matchId: string;
  matchLabel: string;
  current: string;
  recommended: string;
  rationale: string;
}

function rankOf(teams: Team[], code: string): number {
  return teams.find((team) => team.code === code)?.ranking ?? 80;
}

function teamName(teams: Team[], code: string): string {
  return teams.find((team) => team.code === code)?.name ?? code;
}

function matchLabel(match: Match, teams: Team[]): string {
  return `${teamName(teams, match.home)} vs ${teamName(teams, match.away)}`;
}

function sortedUpcoming(matches: Match[]): Match[] {
  return matches
    .filter((match) => match.status === 'UPCOMING')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function pickText(pick: PoolPick, t: Translate = tEs): string {
  if (pick.homeGoals != null && pick.awayGoals != null) return `${pick.homeGoals}-${pick.awayGoals}`;
  if (pick.outcome === 'home') return t('matchdayHero.winHome');
  if (pick.outcome === 'away') return t('matchdayHero.winAway');
  if (pick.outcome === 'draw') return t('matchdayHero.draw');
  return t('opsIntel.noPick');
}

export function recommendPick(match: Match, teams: Team[], t: Translate = tEs): RecommendedPick {
  const homeRank = rankOf(teams, match.home);
  const awayRank = rankOf(teams, match.away);
  const diff = awayRank - homeRank;
  const absDiff = Math.abs(diff);

  if (absDiff <= 4) {
    return {
      pick: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
      label: t('opsIntel.drawLabel'),
      confidence: 'Baja',
      rationale: t('opsIntel.drawRationale'),
      risk: t('opsIntel.drawRisk'),
    };
  }

  const homeBetter = diff > 0;
  const clearEdge = absDiff >= 18;
  const score = clearEdge ? (homeBetter ? '2-0' : '0-2') : homeBetter ? '1-0' : '0-1';
  const [homeGoals = 1, awayGoals = 0] = score.split('-').map(Number);

  return {
    pick: {
      outcome: homeBetter ? 'home' : 'away',
      homeGoals,
      awayGoals,
    },
    label: `${homeBetter ? teamName(teams, match.home) : teamName(teams, match.away)} ${score}`,
    confidence: clearEdge ? 'Alta' : 'Media',
    rationale: t('opsIntel.edgeRationale', { diff: absDiff }),
    risk: t('opsIntel.edgeRisk'),
  };
}

export function buildRecommendedPicks(matches: Match[], teams: Team[], limit = 24): Record<string, PoolPick> {
  return Object.fromEntries(
    sortedUpcoming(matches)
      .slice(0, limit)
      .map((match) => [match.id, recommendPick(match, teams).pick]),
  );
}

function strategyPick(match: Match, teams: Team[], strategy: PickStrategyId, t: Translate = tEs): { pick: PoolPick; rationale: string } {
  const homeRank = rankOf(teams, match.home);
  const awayRank = rankOf(teams, match.away);
  const diff = awayRank - homeRank;
  const absDiff = Math.abs(diff);
  const homeBetter = diff > 0;
  const underdogOutcome = homeBetter ? 'away' : 'home';

  if (strategy === 'conservative') {
    const rec = recommendPick(match, teams, t);
    return { pick: rec.pick, rationale: rec.rationale };
  }

  if (strategy === 'aggressive') {
    if (absDiff <= 4) {
      return {
        pick: { outcome: 'draw', homeGoals: 2, awayGoals: 2 },
        rationale: t('opsIntel.stratAggDraw'),
      };
    }
    if (homeBetter) {
      return {
        pick: { outcome: 'home', homeGoals: absDiff >= 18 ? 3 : 2, awayGoals: 1 },
        rationale: t('opsIntel.stratAggHome'),
      };
    }
    return {
      pick: { outcome: 'away', homeGoals: 1, awayGoals: absDiff >= 18 ? 3 : 2 },
      rationale: t('opsIntel.stratAggAway'),
    };
  }

  if (absDiff <= 6) {
    return {
      pick: { outcome: 'draw', homeGoals: 0, awayGoals: 0 },
      rationale: t('opsIntel.stratContraDraw'),
    };
  }
  if (underdogOutcome === 'home') {
    return {
      pick: { outcome: 'home', homeGoals: 1, awayGoals: 0 },
      rationale: t('opsIntel.stratContraHome'),
    };
  }
  return {
    pick: { outcome: 'away', homeGoals: 0, awayGoals: 1 },
    rationale: t('opsIntel.stratContraAway'),
  };
}

export function comparePickStrategies(matches: Match[], teams: Team[], limit = 8, t: Translate = tEs): StrategyPreview[] {
  const upcoming = sortedUpcoming(matches).slice(0, limit);
  const strategies: Array<{
    id: PickStrategyId;
    label: string;
    summary: string;
    risk: string;
    confidence: StrategyPreview['confidence'];
  }> = [
    {
      id: 'conservative',
      label: t('opsIntel.stratConservative'),
      summary: t('opsIntel.stratConsSummary'),
      risk: t('opsIntel.stratConsRisk'),
      confidence: 'Media',
    },
    {
      id: 'aggressive',
      label: t('opsIntel.stratAggressive'),
      summary: t('opsIntel.stratAggSummary'),
      risk: t('opsIntel.stratAggRisk'),
      confidence: 'Baja',
    },
    {
      id: 'contrarian',
      label: t('opsIntel.stratContrarian'),
      summary: t('opsIntel.stratContraSummary'),
      risk: t('opsIntel.stratContraRisk'),
      confidence: 'Baja',
    },
  ];

  return strategies.map((strategy) => ({
    strategy: strategy.id,
    label: strategy.label,
    summary: strategy.summary,
    risk: strategy.risk,
    confidence: strategy.confidence,
    picks: upcoming.map((match) => {
      const preview = strategyPick(match, teams, strategy.id, t);
      return {
        matchId: match.id,
        matchLabel: matchLabel(match, teams),
        prediction: pickText(preview.pick, t),
        rationale: preview.rationale,
      };
    }),
  }));
}

export function evaluateAIStrategyOutcomes(matches: Match[], teams: Team[], t: Translate = tEs): StrategyScorecard {
  const played = matches.filter(
    (match) => match.status === 'FT' && match.homeGoals != null && match.awayGoals != null,
  );
  const labels: Record<PickStrategyId, string> = {
    conservative: t('opsIntel.stratConservative'),
    aggressive: t('opsIntel.stratAggressive'),
    contrarian: t('opsIntel.stratContrarian'),
  };
  const strategies: PickStrategyId[] = ['conservative', 'aggressive', 'contrarian'];
  const rows = strategies.map((strategy) => {
    let points = 0;
    let exactScores = 0;
    let outcomeHits = 0;
    let misses = 0;
    for (const match of played) {
      const { pick } = strategyPick(match, teams, strategy, t);
      const realHome = match.homeGoals ?? 0;
      const realAway = match.awayGoals ?? 0;
      const realOutcome: PoolPick['outcome'] = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';
      const exact = pick.homeGoals === realHome && pick.awayGoals === realAway;
      const outcome = pick.outcome === realOutcome;
      if (exact) {
        points += 3;
        exactScores += 1;
      } else if (outcome) {
        points += 1;
        outcomeHits += 1;
      } else {
        misses += 1;
      }
    }
    return {
      strategy,
      label: labels[strategy],
      points,
      exactScores,
      outcomeHits,
      misses,
      efficiency: played.length ? Math.round(((exactScores + outcomeHits) / played.length) * 100) : 0,
    };
  });
  const best = [...rows].sort((a, b) => b.points - a.points || b.efficiency - a.efficiency)[0];
  return {
    played: played.length,
    summary: played.length
      ? t('opsIntel.scorecardSummary', { n: played.length })
      : t('opsIntel.scorecardEmpty'),
    bestLabel: best && played.length ? t('opsIntel.scorecardBest', { label: best.label, pts: best.points }) : t('opsIntel.scorecardWaiting'),
    strategies: rows,
  };
}

export function buildPickChangeHints(
  matches: Match[],
  teams: Team[],
  picks: Record<string, PoolPick>,
  limit = 6,
  t: Translate = tEs,
): PickChangeHint[] {
  return sortedUpcoming(matches)
    .map((match) => {
      const current = picks[match.id];
      if (!current?.outcome) return null;
      const rec = recommendPick(match, teams, t);
      const sameOutcome = current.outcome === rec.pick.outcome;
      const sameScore = current.homeGoals === rec.pick.homeGoals && current.awayGoals === rec.pick.awayGoals;
      if (sameOutcome && sameScore) return null;
      return {
        matchId: match.id,
        matchLabel: matchLabel(match, teams),
        current: pickText(current, t),
        recommended: pickText(rec.pick, t),
        rationale: rec.rationale,
      };
    })
    .filter((hint): hint is PickChangeHint => Boolean(hint))
    .slice(0, limit);
}

function confLabel(confidence: 'Alta' | 'Media' | 'Baja', t: Translate): string {
  return confidence === 'Alta' ? t('opsIntel.confHigh') : confidence === 'Media' ? t('opsIntel.confMed') : t('opsIntel.confLow');
}

export function buildDayBrief(matches: Match[], teams: Team[], picks: Record<string, PoolPick>, t: Translate = tEs): DayBrief {
  const upcoming = sortedUpcoming(matches);
  const next = upcoming[0];
  if (!next) {
    return {
      title: t('opsIntel.briefNoMatchesTitle'),
      subtitle: t('opsIntel.briefNoMatchesSub'),
      highlights: [t('opsIntel.briefHl1'), t('opsIntel.briefHl2')],
      nextAction: t('opsIntel.briefNoMatchesAction'),
    };
  }

  const dayMatches = upcoming.filter((match) => match.date === next.date);
  const missing = dayMatches.filter((match) => !picks[match.id]?.outcome).length;
  const complete = dayMatches.filter((match) => {
    const pick = picks[match.id];
    return pick?.homeGoals != null && pick.awayGoals != null;
  }).length;
  const rec = recommendPick(next, teams, t);

  return {
    title: `${teamName(teams, next.home)} vs ${teamName(teams, next.away)}`,
    subtitle: `${next.date} · ${next.time || t('opsIntel.timePending')} · ${next.venue}`,
    highlights: [
      t('opsIntel.briefHlMatches', { n: dayMatches.length }),
      t('opsIntel.briefHlMissing', { n: missing }),
      t('opsIntel.briefHlScores', { complete, total: dayMatches.length }),
      t('opsIntel.briefHlSuggestion', { label: rec.label, conf: confLabel(rec.confidence, t) }),
    ],
    nextAction: missing ? t('opsIntel.briefActionComplete') : t('opsIntel.briefActionReview'),
  };
}

export function buildPoolDiagnostics(
  matches: Match[],
  picks: Record<string, PoolPick>,
  leaderboard: LeaderboardEntry[] = [],
  playerName = '',
  t: Translate = tEs,
): PoolDiagnostics {
  const upcoming = sortedUpcoming(matches);
  const pickedPending = upcoming.filter((match) => picks[match.id]?.outcome).length;
  const completeScores = upcoming.filter((match) => {
    const pick = picks[match.id];
    return pick?.homeGoals != null && pick.awayGoals != null;
  }).length;
  const scoredPicks = Object.values(picks).filter((pick) => pick.homeGoals != null && pick.awayGoals != null);
  const drawCount = Object.values(picks).filter((pick) => pick.outcome === 'draw').length;
  const avgGoals =
    scoredPicks.length > 0
      ? scoredPicks.reduce((sum, pick) => sum + (pick.homeGoals ?? 0) + (pick.awayGoals ?? 0), 0) / scoredPicks.length
      : 0;
  const drawShare = Object.keys(picks).length ? drawCount / Object.keys(picks).length : 0;
  const coveragePct = upcoming.length ? Math.round((pickedPending / upcoming.length) * 100) : 100;
  const scorePct = upcoming.length ? Math.round((completeScores / upcoming.length) * 100) : 100;
  const humanRows = leaderboard.filter((row) => !row.playerName.startsWith(AI_AGENT_PREFIX));
  const leader = humanRows[0] ?? leaderboard[0];
  const userRow = playerName
    ? leaderboard.find((row) => row.playerName.trim().toLowerCase() === playerName.trim().toLowerCase())
    : undefined;
  const aiLeader = Boolean(leaderboard[0]?.playerName.startsWith(AI_AGENT_PREFIX));

  let styleLabel = t('opsIntel.styleUndefined');
  let styleDetail = t('opsIntel.styleUndefinedDetail');
  if (scoredPicks.length >= 3) {
    if (avgGoals >= 3.2) {
      styleLabel = t('opsIntel.styleAggressive');
      styleDetail = t('opsIntel.styleAggressiveDetail', { avg: avgGoals.toFixed(1) });
    } else if (drawShare >= 0.3) {
      styleLabel = t('opsIntel.styleDraws');
      styleDetail = t('opsIntel.styleDrawsDetail', { pct: Math.round(drawShare * 100) });
    } else {
      styleLabel = t('opsIntel.styleLowVar');
      styleDetail = t('opsIntel.styleLowVarDetail', { avg: avgGoals.toFixed(1) });
    }
  }

  return {
    totalPending: upcoming.length,
    pickedPending,
    completeScores,
    missingWinner: Math.max(0, upcoming.length - pickedPending),
    missingScore: Math.max(0, upcoming.length - completeScores),
    coveragePct,
    scorePct,
    styleLabel,
    styleDetail,
    leaderLabel: leader ? `${leader.playerName} · ${leader.points} pts` : t('opsIntel.noLeaderboard'),
    familySignal: aiLeader
      ? t('opsIntel.signalAiLeads')
      : userRow
        ? t('opsIntel.signalYourRow', { points: userRow.points, eff: userRow.efficiency })
        : humanRows.length
          ? t('opsIntel.signalHumans', { n: humanRows.length })
          : t('opsIntel.signalInvite'),
    recommendedAction:
      coveragePct < 80
        ? t('opsIntel.actionCompleteWinners')
        : scorePct < 80
          ? t('opsIntel.actionCloseScores')
          : t('opsIntel.actionReviewUncertain'),
  };
}

export function buildDataReadiness(input: DataReadinessInput, t: Translate = tEs): DataReadiness {
  const checks: DataReadiness['checks'] = [
    {
      id: 'calendar',
      label: t('dataReadiness.calendar'),
      status: input.matches >= 100 && input.teams >= 48 ? 'ok' : 'warn',
      detail: t('dataReadiness.calendarDetail', { matches: input.matches, teams: input.teams }),
    },
    {
      id: 'assets',
      label: t('dataReadiness.assets'),
      status: input.venues >= 16 && input.players >= 200 ? 'ok' : 'warn',
      detail: t('dataReadiness.assetsDetail', { venues: input.venues, players: input.players }),
    },
    {
      id: 'ratings',
      label: t('dataReadiness.ratings'),
      status: input.estimatedRatings === 0 ? 'ok' : input.estimatedRatings <= 48 ? 'info' : 'warn',
      detail: input.estimatedRatings ? t('dataReadiness.ratingsEstimated', { n: input.estimatedRatings }) : t('dataReadiness.ratingsCovered'),
    },
    {
      id: 'results',
      label: t('dataReadiness.results'),
      status: input.resultsSource === 'configured' ? 'ok' : 'warn',
      detail: input.resultsSource === 'configured' ? t('dataReadiness.feedConnected') : t('dataReadiness.feedPending'),
    },
    {
      id: 'pool',
      label: t('dataReadiness.pool'),
      status: input.poolDurable ? 'ok' : 'warn',
      detail: input.poolDurable ? t('dataReadiness.poolDurable') : t('dataReadiness.poolToVerify'),
    },
    {
      id: 'ai',
      label: t('dataReadiness.ai'),
      status: input.aiConfigured ? 'ok' : 'info',
      detail: input.aiConfigured ? t('dataReadiness.aiConfigured') : t('dataReadiness.aiFallback'),
    },
  ];

  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.status === 'ok' ? 100 : check.status === 'info' ? 70 : 35), 0) /
      checks.length,
  );
  const nextActions = checks
    .filter((check) => check.status !== 'ok')
    .slice(0, 3)
    .map((check) => {
      if (check.id === 'results') return t('dataReadiness.actionResults');
      if (check.id === 'ratings') return t('dataReadiness.actionRatings');
      if (check.id === 'pool') return t('dataReadiness.actionPool');
      if (check.id === 'ai') return t('dataReadiness.actionAi');
      return t('dataReadiness.actionGeneric', { label: check.label.toLowerCase() });
    });

  return {
    score,
    label: score >= 88 ? t('dataReadiness.labelReady') : score >= 70 ? t('dataReadiness.labelOperational') : t('dataReadiness.labelNeedsReview'),
    status: score >= 88 ? 'ok' : score >= 70 ? 'info' : 'warn',
    checks,
    nextActions: nextActions.length ? nextActions : [t('dataReadiness.fallbackAction')],
  };
}
