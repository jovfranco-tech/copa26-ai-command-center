import { describe, it, expect } from 'vitest';
import { mapProviderMatches, mapProviderStatus, type ProviderMatch } from '../src/resultsMapping.js';

const finished = (home: string, away: string, hg: number, ag: number): ProviderMatch => ({
  status: 'FINISHED',
  homeTeam: { tla: home, name: home },
  awayTeam: { tla: away, name: away },
  score: { fullTime: { home: hg, away: ag } },
});

describe('mapProviderStatus', () => {
  it('mapea estados del proveedor a los nuestros', () => {
    expect(mapProviderStatus('FINISHED')).toBe('FT');
    expect(mapProviderStatus('AWARDED')).toBe('FT');
    expect(mapProviderStatus('IN_PLAY')).toBe('LIVE');
    expect(mapProviderStatus('PAUSED')).toBe('LIVE');
    expect(mapProviderStatus('SCHEDULED')).toBeNull();
    expect(mapProviderStatus('TIMED')).toBeNull();
  });
});

describe('mapProviderMatches', () => {
  it('mapea un partido terminado al fixture correcto por el par de equipos (tla)', () => {
    const { results, matched } = mapProviderMatches([finished('MEX', 'RSA', 2, 1)]);
    expect(matched).toBe(1);
    expect(results.M001).toEqual({ homeGoals: 2, awayGoals: 1, status: 'FT', minute: null, source: 'auto' });
  });

  it('ignora partidos no jugados (SCHEDULED/TIMED)', () => {
    const { results, matched } = mapProviderMatches([
      { status: 'SCHEDULED', homeTeam: { tla: 'MEX' }, awayTeam: { tla: 'RSA' } },
    ]);
    expect(matched).toBe(0);
    expect(Object.keys(results)).toHaveLength(0);
  });

  it('marca LIVE con minuto', () => {
    const { results } = mapProviderMatches([
      {
        status: 'IN_PLAY',
        minute: 63,
        homeTeam: { tla: 'MEX' },
        awayTeam: { tla: 'RSA' },
        score: { fullTime: { home: 1, away: 0 } },
      },
    ]);
    expect(results.M001.status).toBe('LIVE');
    expect(results.M001.minute).toBe(63);
  });

  it('reporta en unmatched los equipos inexistentes y las parejas que no son fixture nuestro', () => {
    const { matched, unmatched } = mapProviderMatches([
      finished('XXX', 'YYY', 1, 0), // equipos inexistentes
      finished('MEX', 'BRA', 1, 0), // par válido pero no es un partido de grupos nuestro
    ]);
    expect(matched).toBe(0);
    expect(unmatched.length).toBe(2);
  });

  it('resuelve por nombre cuando el tla no coincide', () => {
    const { results } = mapProviderMatches([
      {
        status: 'FINISHED',
        homeTeam: { tla: 'ZZZ', name: 'México' },
        awayTeam: { tla: 'WWW', name: 'Sudáfrica' },
        score: { fullTime: { home: 3, away: 0 } },
      },
    ]);
    expect(results.M001?.homeGoals).toBe(3);
  });

  it('no marca resultado si faltan los goles', () => {
    const { matched } = mapProviderMatches([
      { status: 'FINISHED', homeTeam: { tla: 'MEX' }, awayTeam: { tla: 'RSA' }, score: { fullTime: {} } },
    ]);
    expect(matched).toBe(0);
  });

  it('resuelve el alias de código del proveedor (URY → URU, Uruguay)', () => {
    const { results, matched } = mapProviderMatches([
      {
        status: 'FINISHED',
        homeTeam: { tla: 'URY', name: 'Uruguay' },
        awayTeam: { tla: 'CPV', name: 'Cape Verde Islands' },
        score: { fullTime: { home: 1, away: 0 } },
      },
    ]);
    expect(matched).toBe(1);
    expect(results.M046).toEqual({ homeGoals: 1, awayGoals: 0, status: 'FT', minute: null, source: 'auto' });
  });
});
