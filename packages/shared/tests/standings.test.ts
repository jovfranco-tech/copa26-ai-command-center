import { describe, it, expect } from 'vitest';
import { computeStandings, groupTable } from '../src/standings.js';
import type { Team, Match } from '../src/types.js';

describe('Cálculos de Standings (Clasificación de Grupos)', () => {
  const mockTeams: Team[] = [
    { id: 'ARG', code: 'ARG', name: 'Argentina', group: 'A', ranking: 1, colorA: '#74acdf', colorB: '#ffffff' },
    { id: 'FRA', code: 'FRA', name: 'Francia', group: 'A', ranking: 2, colorA: '#002395', colorB: '#ffffff' },
    { id: 'KOR', code: 'KOR', name: 'Corea del Sur', group: 'A', ranking: 22, colorA: '#c60c30', colorB: '#ffffff' },
    { id: 'SEN', code: 'SEN', name: 'Senegal', group: 'A', ranking: 20, colorA: '#00853f', colorB: '#ffffff' },
  ];

  it('debe inicializar la tabla correctamente con valores en cero', () => {
    const standings = computeStandings(mockTeams, []);
    expect(standings['ARG']).toBeDefined();
    expect(standings['ARG']!.Pts).toBe(0);
    expect(standings['ARG']!.P).toBe(0);
    expect(standings['ARG']!.W).toBe(0);
    expect(standings['ARG']!.D).toBe(0);
    expect(standings['ARG']!.L).toBe(0);
    expect(standings['ARG']!.GF).toBe(0);
    expect(standings['ARG']!.GA).toBe(0);
    expect(standings['ARG']!.GD).toBe(0);
    expect(standings['ARG']!.form).toEqual([]);
  });

  it('debe calcular puntos y récords correctamente para victorias y derrotas', () => {
    const matches: Match[] = [
      {
        id: 'M1',
        group: 'A',
        stage: 'Group',
        home: 'ARG',
        away: 'FRA',
        homeGoals: 2,
        awayGoals: 1,
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
      },
    ];

    const standings = computeStandings(mockTeams, matches);

    expect(standings['ARG']!.P).toBe(1);
    expect(standings['ARG']!.W).toBe(1);
    expect(standings['ARG']!.Pts).toBe(3);
    expect(standings['ARG']!.GF).toBe(2);
    expect(standings['ARG']!.GA).toBe(1);
    expect(standings['ARG']!.GD).toBe(1);
    expect(standings['ARG']!.form).toEqual(['W']);

    expect(standings['FRA']!.P).toBe(1);
    expect(standings['FRA']!.L).toBe(1);
    expect(standings['FRA']!.Pts).toBe(0);
    expect(standings['FRA']!.GF).toBe(1);
    expect(standings['FRA']!.GA).toBe(2);
    expect(standings['FRA']!.GD).toBe(-1);
    expect(standings['FRA']!.form).toEqual(['L']);
  });

  it('debe calcular puntos correctamente para empates', () => {
    const matches: Match[] = [
      {
        id: 'M2',
        group: 'A',
        stage: 'Group',
        home: 'KOR',
        away: 'SEN',
        homeGoals: 2,
        awayGoals: 2,
        status: 'FT',
        date: '2026-06-12',
        time: '18:00',
        venue: 'NY',
        round: '1',
        matchday: 1,
        minute: null,
        possH: 45,
        shotsH: 8,
        shotsA: 12,
        shotsTH: 4,
        shotsTA: 6,
      },
    ];

    const standings = computeStandings(mockTeams, matches);

    expect(standings['KOR']!.Pts).toBe(1);
    expect(standings['KOR']!.D).toBe(1);
    expect(standings['KOR']!.form).toEqual(['D']);

    expect(standings['SEN']!.Pts).toBe(1);
    expect(standings['SEN']!.D).toBe(1);
    expect(standings['SEN']!.form).toEqual(['D']);
  });

  it('debe ordenar el grupo resolviendo desempates por Pts -> GD -> GF', () => {
    const matches: Match[] = [
      // ARG gana 2-0 a KOR (ARG: 3 pts, GD +2, GF 2)
      {
        id: 'M1',
        group: 'A',
        stage: 'Group',
        home: 'ARG',
        away: 'KOR',
        homeGoals: 2,
        awayGoals: 0,
        status: 'FT',
        date: '2026-06-12',
        time: '15:00',
        venue: 'LA',
        round: '1',
        matchday: 1,
        minute: null,
        possH: 50,
        shotsH: 10,
        shotsA: 5,
        shotsTH: 5,
        shotsTA: 2,
      },
      // SEN gana 4-3 a FRA (SEN: 3 pts, GD +1, GF 4)
      {
        id: 'M2',
        group: 'A',
        stage: 'Group',
        home: 'SEN',
        away: 'FRA',
        homeGoals: 4,
        awayGoals: 3,
        status: 'FT',
        date: '2026-06-12',
        time: '18:00',
        venue: 'NY',
        round: '1',
        matchday: 1,
        minute: null,
        possH: 40,
        shotsH: 12,
        shotsA: 15,
        shotsTH: 7,
        shotsTA: 8,
      },
    ];

    const standings = computeStandings(mockTeams, matches);
    const sorted = groupTable('A', standings);

    // 1° ARG (3 pts, GD +2)
    expect(sorted[0]!.team).toBe('ARG');
    expect(sorted[0]!.rank).toBe(1);

    // 2° SEN (3 pts, GD +1, GF 4)
    expect(sorted[1]!.team).toBe('SEN');
    expect(sorted[1]!.rank).toBe(2);

    // 3° FRA (0 pts, GD -1, GF 3)
    expect(sorted[2]!.team).toBe('FRA');
    expect(sorted[2]!.rank).toBe(3);

    // 4° KOR (0 pts, GD -2, GF 0)
    expect(sorted[3]!.team).toBe('KOR');
    expect(sorted[3]!.rank).toBe(4);
  });
});
