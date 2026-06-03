import { describe, it, expect } from 'vitest';
import { mock } from '@worldcup/shared';
import { mapDatabasePlayersToLineups } from '../stadiumDataMapper';

const players = mock.PLAYERS;
const isGeneric = (p: { id: string; slotId?: string }) => p.id === p.slotId;

describe('mapDatabasePlayersToLineups (alineaciones del estadio)', () => {
  it('arma 11 jugadores por equipo para selecciones con plantilla detallada (ARG vs FRA)', () => {
    const l = mapDatabasePlayersToLineups(players, 'ARG', 'FRA', 'm1');
    expect(l.teams.home.players).toHaveLength(11);
    expect(l.teams.away.players).toHaveLength(11);
  });

  it('selecciones SIN plantilla detallada (KOR vs CZE) dan 11 jugadores REALES, sin placeholders', () => {
    const l = mapDatabasePlayersToLineups(players, 'KOR', 'CZE', 'm2');
    for (const side of ['home', 'away'] as const) {
      const team = l.teams[side].players;
      expect(team, side).toHaveLength(11);
      // Los placeholders genéricos usan id === slotId; los jugadores reales usan el id de BD.
      expect(team.filter(isGeneric).map((p) => p.name), `${side} genéricos`).toEqual([]);
    }
  });

  it('coloca exactamente un portero por equipo', () => {
    const l = mapDatabasePlayersToLineups(players, 'POR', 'JPN', 'm3');
    expect(l.teams.home.players.filter((p) => p.position === 'GK')).toHaveLength(1);
    expect(l.teams.away.players.filter((p) => p.position === 'GK')).toHaveLength(1);
  });

  it('cada jugador tiene coordenadas de cancha (x, z) finitas y dorsal', () => {
    const l = mapDatabasePlayersToLineups(players, 'KOR', 'CZE', 'm4');
    for (const p of [...l.teams.home.players, ...l.teams.away.players]) {
      expect(Number.isFinite(p.x), p.name).toBe(true);
      expect(Number.isFinite(p.z), p.name).toBe(true);
      expect(typeof p.number).toBe('number');
    }
  });

  it('no repite el mismo jugador en dos slots', () => {
    const l = mapDatabasePlayersToLineups(players, 'USA', 'MAR', 'm5');
    const ids = l.teams.home.players.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refleja el estado y minuto del partido', () => {
    const l = mapDatabasePlayersToLineups(players, 'MEX', 'RSA', 'm6', 'live', 67);
    expect(l.status).toBe('live');
    expect(l.minute).toBe(67);
  });

  it('una selección desconocida (sin jugadores) sigue dando un XI de 11', () => {
    const l = mapDatabasePlayersToLineups(players, 'ZZZ', 'ARG', 'm7');
    expect(l.teams.home.players).toHaveLength(11);
  });
});
