import { describe, it, expect } from 'vitest';
import { mock } from '@worldcup/shared';
import { mapDatabasePlayersToLineups, buildMatchLineups } from '../stadiumDataMapper';
import { MATCH_FIXTURES } from '../matchData';
import type { OfficialMatchLineup, OfficialTeamSheet } from '../officialLineups';
import { EXAMPLE_OFFICIAL_LINEUPS } from '../officialLineups.example';

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

// A synthetic 4-3-3 sheet (ordered GK → DF → MF → FW) used to exercise the
// official-lineup resolution path without shipping a fake "official" lineup.
const sheet433 = (mgr: string): OfficialTeamSheet => ({
  formation: '4-3-3',
  manager: mgr,
  starters: [
    { shirt: 1, name: 'Arquero Titular', pos: 'GK' },
    { shirt: 2, name: 'Lateral Derecho', pos: 'DF' },
    { shirt: 3, name: 'Central Uno', pos: 'DF' },
    { shirt: 4, name: 'Central Dos', pos: 'DF' },
    { shirt: 5, name: 'Lateral Izquierdo', pos: 'DF' },
    { shirt: 6, name: 'Volante Uno', pos: 'MF' },
    { shirt: 8, name: 'Volante Dos', pos: 'MF' },
    { shirt: 10, name: 'Volante Tres', pos: 'MF' },
    { shirt: 7, name: 'Extremo Derecho', pos: 'FW' },
    { shirt: 9, name: 'Delantero Centro', pos: 'FW' },
    { shirt: 11, name: 'Extremo Izquierdo', pos: 'FW' },
  ],
});

describe('Estadio: resolución alineación oficial → estimada (buildMatchLineups)', () => {
  it('sin alineación oficial cae a XI estimado para ambos equipos', () => {
    const l = buildMatchLineups(players, 'MEX', 'RSA', 'M001', 'pre-match', 0, {});
    expect(l.dataSource).toBe('estimated');
    expect(l.teams.home.source).toBe('estimated');
    expect(l.teams.away.source).toBe('estimated');
    expect(l.teams.home.players).toHaveLength(11);
    expect(l.teams.away.players).toHaveLength(11);
  });

  it('con ambas alineaciones oficiales usa el XI real y marca dataSource = official', () => {
    const official: Record<string, OfficialMatchLineup> = {
      M001: { status: 'confirmada', source: 'Test', home: sheet433('DT Local'), away: sheet433('DT Visita') },
    };
    const l = buildMatchLineups(players, 'MEX', 'RSA', 'M001', 'pre-match', 0, official);
    expect(l.dataSource).toBe('official');
    expect(l.teams.home.source).toBe('official');
    expect(l.teams.away.source).toBe('official');
    expect(l.teams.home.players).toHaveLength(11);
    expect(l.teams.home.formation).toBe('4-3-3');
    expect(l.teams.home.manager).toBe('DT Local');
    const names = l.teams.home.players.map((p) => p.name);
    expect(names).toContain('Arquero Titular');
    expect(names).toContain('Delantero Centro');
    const shirts = l.teams.home.players.map((p) => p.number).sort((a, b) => a - b);
    expect(shirts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('con sólo una alineación oficial marca dataSource = mixed', () => {
    const official: Record<string, OfficialMatchLineup> = {
      M001: { status: 'confirmada', source: 'Test', home: sheet433('DT Local') },
    };
    const l = buildMatchLineups(players, 'MEX', 'RSA', 'M001', 'pre-match', 0, official);
    expect(l.dataSource).toBe('mixed');
    expect(l.teams.home.source).toBe('official');
    expect(l.teams.away.source).toBe('estimated');
    expect(l.teams.home.players).toHaveLength(11);
    expect(l.teams.away.players).toHaveLength(11);
  });
});

describe('Estadio: plantilla officialLineups.example es válida y usable', () => {
  const playerIds = new Set(players.map((p) => p.id));
  const matchById = new Map(mock.MATCHES.map((m) => [m.id, m]));
  const entries = Object.entries(EXAMPLE_OFFICIAL_LINEUPS);
  const sides = ['home', 'away'] as const;

  it('no está vacía y cada partido existe en el calendario', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [id] of entries) expect(matchById.has(id), id).toBe(true);
  });

  it('cada lado tiene 11 titulares y formación válida (suma 10)', () => {
    for (const [id, entry] of entries) {
      for (const side of sides) {
        const sheet = entry[side]!;
        expect(sheet.starters, `${id}.${side}`).toHaveLength(11);
        expect(sumFormation(sheet.formation), `${id}.${side} formación=${sheet.formation}`).toBe(10);
      }
    }
  });

  it('todos los playerId enlazan a jugadores reales', () => {
    for (const [id, entry] of entries) {
      for (const side of sides) {
        for (const s of entry[side]!.starters) {
          if (s.playerId) expect(playerIds.has(s.playerId), `${id}.${side} ${s.playerId}`).toBe(true);
        }
      }
    }
  });

  it('alimentada a buildMatchLineups produce un XI oficial de 11 por lado', () => {
    for (const [id, entry] of entries) {
      const m = matchById.get(id)!;
      const l = buildMatchLineups(players, m.home, m.away, id, 'pre-match', 0, EXAMPLE_OFFICIAL_LINEUPS);
      expect(l.dataSource, id).toBe('official');
      expect(l.teams.home.players, `${id} home`).toHaveLength(11);
      expect(l.teams.away.players, `${id} away`).toHaveLength(11);
      expect(l.teams.home.source).toBe('official');
      // sanity: the official XI carries names from the sheet, not generated ones
      const homeNames = l.teams.home.players.map((p) => p.name);
      expect(homeNames).toContain(entry.home!.starters[0]!.name);
    }
  });
});
