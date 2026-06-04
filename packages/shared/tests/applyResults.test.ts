import { describe, it, expect } from 'vitest';
import { applyMatchResults } from '../src/applyResults.js';
import { computeStandings } from '../src/standings.js';
import { MATCHES, TEAMS } from '../src/mock/index.js';

describe('applyMatchResults', () => {
  it('aplica un marcador y marca el partido como FT (minuto nulo)', () => {
    const { matches, applied, skipped } = applyMatchResults(MATCHES, { M001: { homeGoals: 2, awayGoals: 1 } });
    expect(applied).toEqual(['M001']);
    expect(skipped).toHaveLength(0);
    const m = matches.find((x) => x.id === 'M001')!;
    expect(m.status).toBe('FT');
    expect(m.homeGoals).toBe(2);
    expect(m.awayGoals).toBe(1);
    expect(m.minute).toBeNull();
  });

  it('es inmutable: no toca el arreglo de partidos original', () => {
    const before = MATCHES.find((x) => x.id === 'M001')!.status;
    applyMatchResults(MATCHES, { M001: { homeGoals: 2, awayGoals: 1 } });
    expect(MATCHES.find((x) => x.id === 'M001')!.status).toBe(before);
  });

  it('reporta (sin lanzar) matchIds inexistentes y marcadores inválidos', () => {
    const { applied, skipped } = applyMatchResults(MATCHES, {
      NOPE: { homeGoals: 1, awayGoals: 0 },
      M002: { homeGoals: -1, awayGoals: 0 },
    });
    expect(applied).toHaveLength(0);
    expect(skipped.map((s) => s.id).sort()).toEqual(['M002', 'NOPE']);
  });

  it('trata marcadores null como pendientes (plantilla sin llenar), sin warning', () => {
    const { applied, pending, skipped } = applyMatchResults(MATCHES, {
      M001: { homeGoals: null, awayGoals: null },
      M002: { homeGoals: 2, awayGoals: 0 },
    });
    expect(applied).toEqual(['M002']);
    expect(pending).toEqual(['M001']);
    expect(skipped).toHaveLength(0);
  });

  it('ignora claves de metadata que empiezan con "_" (p. ej. _README)', () => {
    const { applied, skipped } = applyMatchResults(MATCHES, {
      _README: { homeGoals: null, awayGoals: null },
      M001: { homeGoals: 1, awayGoals: 1 },
    });
    expect(applied).toEqual(['M001']);
    expect(skipped).toHaveLength(0);
  });

  it('la tabla se deriva automáticamente del resultado aplicado', () => {
    const m1 = MATCHES.find((x) => x.id === 'M001')!; // inaugural
    const { matches } = applyMatchResults(MATCHES, { M001: { homeGoals: 3, awayGoals: 0 } });
    const table = computeStandings(TEAMS, matches);
    expect(table[m1.home].Pts).toBe(3);
    expect(table[m1.home].GF).toBe(3);
    expect(table[m1.home].GD).toBe(3);
    expect(table[m1.away].Pts).toBe(0);
    expect(table[m1.away].GA).toBe(3);
  });

  it('status LIVE conserva el minuto', () => {
    const { matches } = applyMatchResults(MATCHES, {
      M001: { homeGoals: 1, awayGoals: 0, status: 'LIVE', minute: 37 },
    });
    const m = matches.find((x) => x.id === 'M001')!;
    expect(m.status).toBe('LIVE');
    expect(m.minute).toBe(37);
  });
});
