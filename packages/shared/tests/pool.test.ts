import { describe, it, expect } from 'vitest';
import type { Match } from '../src/types.js';

interface PoolPick {
  outcome?: 'home' | 'draw' | 'away';
  homeGoals?: number;
  awayGoals?: number;
}

function calculateMatchPoints(match: Match, pick: PoolPick): { points: number; isExact: boolean; isOutcomeCorrect: boolean } {
  if (match.homeGoals == null || match.awayGoals == null) {
    return { points: 0, isExact: false, isOutcomeCorrect: false };
  }

  const realHome = match.homeGoals;
  const realAway = match.awayGoals;

  let realOutcome: 'home' | 'draw' | 'away' = 'draw';
  if (realHome > realAway) realOutcome = 'home';
  else if (realHome < realAway) realOutcome = 'away';

  const predictedOutcome = pick.outcome;
  if (!predictedOutcome) {
    return { points: 0, isExact: false, isOutcomeCorrect: false };
  }

  const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
  const isOutcomeCorrect = predictedOutcome === realOutcome;

  let points = 0;
  if (isExact) {
    points = 3;
  } else if (isOutcomeCorrect) {
    points = 1;
  }

  return { points, isExact, isOutcomeCorrect };
}

describe('Cálculo de Puntos de la Quiniela Familiar', () => {
  const finishedMatch: Match = {
    id: 'M1',
    group: 'A',
    stage: 'Group',
    home: 'ARG',
    away: 'FRA',
    homeGoals: 2,
    awayGoals: 1, // Argentina gana 2-1
    status: 'FT',
    date: '2026-06-12',
    time: '15:00',
    venue: 'LA',
    round: '1',
    matchday: 1,
    minute: null,
    possH: 50,
    shotsH: 10,
    shotsA: 8,
    shotsTH: 5,
    shotsTA: 4,
  };

  it('debe otorgar 3 puntos por marcador exacto (Pleno)', () => {
    const pick: PoolPick = {
      outcome: 'home',
      homeGoals: 2,
      awayGoals: 1,
    };

    const res = calculateMatchPoints(finishedMatch, pick);
    expect(res.points).toBe(3);
    expect(res.isExact).toBe(true);
    expect(res.isOutcomeCorrect).toBe(true);
  });

  it('debe otorgar 1 punto por resultado correcto pero marcador inexacto', () => {
    const pick: PoolPick = {
      outcome: 'home',
      homeGoals: 3,
      awayGoals: 0, // Predice victoria de ARG, pero 3-0 en lugar de 2-1
    };

    const res = calculateMatchPoints(finishedMatch, pick);
    expect(res.points).toBe(1);
    expect(res.isExact).toBe(false);
    expect(res.isOutcomeCorrect).toBe(true);
  });

  it('debe otorgar 0 puntos si el resultado y el marcador son incorrectos', () => {
    const pick: PoolPick = {
      outcome: 'away',
      homeGoals: 0,
      awayGoals: 2, // Predice victoria de FRA 0-2
    };

    const res = calculateMatchPoints(finishedMatch, pick);
    expect(res.points).toBe(0);
    expect(res.isExact).toBe(false);
    expect(res.isOutcomeCorrect).toBe(false);
  });

  it('debe otorgar 0 puntos si el partido no se ha jugado (goles nulos)', () => {
    const upcomingMatch: Match = {
      ...finishedMatch,
      status: 'UPCOMING',
      homeGoals: null,
      awayGoals: null,
    };

    const pick: PoolPick = {
      outcome: 'home',
      homeGoals: 2,
      awayGoals: 1,
    };

    const res = calculateMatchPoints(upcomingMatch, pick);
    expect(res.points).toBe(0);
    expect(res.isExact).toBe(false);
    expect(res.isOutcomeCorrect).toBe(false);
  });
});
