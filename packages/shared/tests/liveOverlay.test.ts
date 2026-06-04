import { describe, it, expect } from 'vitest';
import { sanitizeOverlay, applyAdminOp, emptyOverlay } from '../src/liveOverlay.js';

describe('sanitizeOverlay', () => {
  it('acepta resultados válidos y descarta ids no-partido', () => {
    const o = sanitizeOverlay({
      results: { M001: { homeGoals: 2, awayGoals: 1, status: 'FT' }, hack: { homeGoals: 9, awayGoals: 9 } },
    });
    expect(o.results.M001).toEqual({ homeGoals: 2, awayGoals: 1, status: 'FT', minute: null });
    expect(o.results.hack).toBeUndefined();
  });

  it('coacciona marcadores inválidos a null (pendiente) y status desconocido a FT', () => {
    const o = sanitizeOverlay({ results: { M002: { homeGoals: -3, awayGoals: 'x', status: 'WAT' } } });
    expect(o.results.M002).toEqual({ homeGoals: null, awayGoals: null, status: 'FT', minute: null });
  });

  it('sanea alineaciones: máx 11 titulares, posición válida, recorta strings', () => {
    const starters = Array.from({ length: 15 }, (_, i) => ({ shirt: i + 1, name: 'X', pos: 'ZZ' }));
    const o = sanitizeOverlay({ lineups: { M001: { status: 'confirmada', source: 'S', home: { formation: '4-3-3', starters } } } });
    expect(o.lineups.M001.home!.starters).toHaveLength(11);
    expect(o.lineups.M001.home!.starters[0]!.pos).toBe('MF'); // 'ZZ' → fallback
    expect(o.lineups.M001.status).toBe('confirmada');
  });

  it('descarta una alineación sin home ni away', () => {
    const o = sanitizeOverlay({ lineups: { M001: { status: 'probable', source: 'S' } } });
    expect(o.lineups.M001).toBeUndefined();
  });

  it('limita el número de entradas a 80', () => {
    const results: Record<string, unknown> = {};
    for (let i = 1; i <= 200; i++) results[`M${i}`] = { homeGoals: 0, awayGoals: 0 };
    const o = sanitizeOverlay({ results });
    expect(Object.keys(o.results).length).toBeLessThanOrEqual(80);
  });
});

describe('applyAdminOp', () => {
  it('set-result añade un resultado sin mutar el original', () => {
    const base = emptyOverlay();
    const next = applyAdminOp(base, { op: 'set-result', matchId: 'M001', data: { homeGoals: 1, awayGoals: 0 } });
    expect(next!.results.M001).toEqual({ homeGoals: 1, awayGoals: 0 });
    expect(base.results.M001).toBeUndefined(); // inmutable
  });

  it('clear-result elimina la entrada', () => {
    const o = applyAdminOp({ results: { M001: { homeGoals: 1, awayGoals: 0 } }, lineups: {}, updatedAt: null }, {
      op: 'clear-result',
      matchId: 'M001',
    });
    expect(o!.results.M001).toBeUndefined();
  });

  it('rechaza matchId inválido o op desconocida', () => {
    expect(applyAdminOp(emptyOverlay(), { op: 'set-result', matchId: 'hack', data: {} })).toBeNull();
    expect(applyAdminOp(emptyOverlay(), { op: 'nope' as never, matchId: 'M001' })).toBeNull();
  });
});
