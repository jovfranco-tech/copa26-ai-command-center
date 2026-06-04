import { describe, it, expect } from 'vitest';
import { mock } from '@worldcup/shared';
import { mapDatabasePlayersToLineups } from '../stadiumDataMapper';
import { MATCH_FIXTURES } from '../matchData';

const players = mock.PLAYERS;
const teams = mock.TEAMS;
const teamCodes = new Set(teams.map((t) => t.code));
const nameByCode = new Map(teams.map((t) => [t.code, t.name]));
// Teams with a hand-authored SLOT_TEMPLATE — their name comes from TEAM_INFO, the
// known drift point vs the dataset, so we assert those stay consistent.
const TEMPLATE_TEAMS = ['ARG', 'FRA', 'BRA', 'GER', 'ESP', 'NED', 'MEX', 'RSA'];
const opp = (code: string) => (code === 'ARG' ? 'FRA' : 'ARG');
const sumFormation = (f: string) => f.split('-').reduce((acc, n) => acc + (parseInt(n, 10) || 0), 0);

describe('Estadio: integridad de alineaciones de las 48 selecciones', () => {
  it('toda selección produce un XI de 11 jugadores (home y away)', () => {
    for (const t of teams) {
      const l = mapDatabasePlayersToLineups(players, t.code, opp(t.code), `m-${t.code}`);
      expect(l.teams.home.players, `${t.code} home`).toHaveLength(11);
      expect(l.teams.away.players, `${opp(t.code)} away`).toHaveLength(11);
    }
  });

  it('toda formación generada es válida (suma 10 jugadores de campo)', () => {
    for (const t of teams) {
      const l = mapDatabasePlayersToLineups(players, t.code, opp(t.code), `f-${t.code}`);
      expect(sumFormation(l.teams.home.formation), `${t.code} formación=${l.teams.home.formation}`).toBe(10);
    }
  });
});

describe('Estadio: consistencia con el dataset', () => {
  it('los equipos con plantilla detallada muestran el mismo nombre que el dataset (sin drift)', () => {
    for (const code of TEMPLATE_TEAMS) {
      const l = mapDatabasePlayersToLineups(players, code, opp(code), `n-${code}`);
      expect(l.teams.home.teamName, code).toBe(nameByCode.get(code));
    }
  });

  it('los partidos demo (fallback offline) referencian selecciones reales', () => {
    for (const m of MATCH_FIXTURES) {
      expect(teamCodes.has(m.teams.homeShort), `${m.id} home=${m.teams.homeShort}`).toBe(true);
      expect(teamCodes.has(m.teams.awayShort), `${m.id} away=${m.teams.awayShort}`).toBe(true);
    }
  });
});
