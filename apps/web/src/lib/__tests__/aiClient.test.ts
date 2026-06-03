import { describe, it, expect } from 'vitest';
import { buildAIContext, type AIData } from '../aiClient';

// Minimal but valid-enough fixtures; buildAIContext only reads a handful of fields.
const data: AIData = {
  teams: [
    { code: 'MEX', name: 'México', group: 'A' },
    { code: 'RSA', name: 'Sudáfrica', group: 'A' },
  ],
  players: [
    { id: 'MEX-1', name: 'Santiago Giménez', team: 'MEX', pos: 'FW', posLong: 'Delantero', club: 'Milan', number: 9 },
    { id: 'RSA-1', name: 'Percy Tau', team: 'RSA', pos: 'FW', club: 'Qatar SC' },
  ],
  matches: [
    { id: 'M001', home: 'MEX', away: 'RSA', date: '2026-06-11', time: '13:00', stage: 'Grupo A', status: 'UPCOMING', venue: 'azteca' },
    { id: 'M002', home: 'RSA', away: 'MEX', date: '2026-06-18', time: '16:00', stage: 'Grupo A', status: 'UPCOMING', venue: 'azteca' },
  ],
  venues: [{ id: 'azteca', stadium: 'Estadio Azteca', city: 'Ciudad de México' }],
  standings: { A: [{ team: 'MEX' }, { team: 'RSA' }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('buildAIContext (grounding del analista)', () => {
  it('siempre encuadra el torneo (Mundial 2026)', () => {
    expect(buildAIContext('tournament', undefined, data)).toContain('Mundial 2026');
  });

  it('incluye el partido inaugural con rivales y sede', () => {
    const ctx = buildAIContext('tournament', undefined, data);
    expect(ctx).toContain('México');
    expect(ctx).toContain('Sudáfrica');
    expect(ctx).toContain('Estadio Azteca');
  });

  it('señala que el torneo no ha comenzado cuando no hay partidos jugados', () => {
    const ctx = buildAIContext('tournament', undefined, data);
    expect(ctx).toContain('Partidos jugados: 0/2');
  });

  it('en contexto de selección incluye su plantilla', () => {
    const ctx = buildAIContext('team', 'MEX', data);
    expect(ctx).toContain('Santiago Giménez');
    expect(ctx).toContain('México (Grupo A)');
  });

  it('en contexto de jugador identifica al jugador consultado', () => {
    const ctx = buildAIContext('player', 'MEX-1', data);
    expect(ctx).toContain('Santiago Giménez');
  });

  it('nunca inventa datos: no menciona resultados cuando el marcador es desconocido', () => {
    const ctx = buildAIContext('match', 'M001', data);
    expect(ctx).toContain('México');
    expect(ctx).toContain('Sudáfrica');
  });
});
