import { describe, it, expect } from 'vitest';
import { topScorers, topAssists, topCards, playersByTeam, teamGoalsFor } from '../src/selectors.js';
import type { Player } from '../src/types.js';

const mk = (id: string, team: string, opts: Partial<Player> = {}): Player => ({
  id,
  name: id,
  team,
  pos: 'FW',
  posLong: 'Delantero',
  club: 'Club',
  age: 25,
  number: 9,
  goals: 0,
  assists: 0,
  minutes: 0,
  yellow: 0,
  red: 0,
  photoAssetId: null,
  profileUrl: null,
  ...opts,
});

const players: Player[] = [
  mk('A-1', 'ARG', { goals: 3, assists: 1 }),
  mk('A-2', 'ARG', { goals: 1, assists: 4, yellow: 2, red: 1 }),
  mk('B-1', 'BRA', { goals: 5, assists: 0 }),
  mk('B-2', 'BRA', { goals: 0, assists: 2, yellow: 1 }),
];

describe('Selectors de estadísticas', () => {
  it('topScorers ordena por goles y desempata por asistencias', () => {
    expect(topScorers(players, 3).map((p) => p.id)).toEqual(['B-1', 'A-1', 'A-2']);
  });

  it('topAssists ordena por asistencias', () => {
    expect(topAssists(players, 2).map((p) => p.id)).toEqual(['A-2', 'B-2']);
  });

  it('topCards pondera roja=2 + amarilla', () => {
    expect(topCards(players, 1)[0]!.id).toBe('A-2');
  });

  it('respeta el límite n', () => {
    expect(topScorers(players, 2)).toHaveLength(2);
    expect(topScorers(players, 10)).toHaveLength(4);
  });

  it('playersByTeam filtra por selección', () => {
    expect(playersByTeam(players, 'ARG').map((p) => p.id)).toEqual(['A-1', 'A-2']);
    expect(playersByTeam(players, 'XYZ')).toEqual([]);
  });

  it('teamGoalsFor suma los goles de la selección', () => {
    expect(teamGoalsFor(players, 'ARG')).toBe(4);
    expect(teamGoalsFor(players, 'BRA')).toBe(5);
  });

  it('no muta el array original al ordenar', () => {
    const order = players.map((p) => p.id);
    topScorers(players);
    expect(players.map((p) => p.id)).toEqual(order);
  });
});
