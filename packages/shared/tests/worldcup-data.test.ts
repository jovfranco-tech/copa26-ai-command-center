/**
 * Integrity + traceability guards for the tournament dataset (worldcup2026.json)
 * and the curated squads. These run in CI (pnpm test) so bad data — duplicate
 * matches, orphan players, broken refs, out-of-order fixtures, fabricated stats —
 * can never reach a deploy.
 */
import { describe, it, expect } from 'vitest';
import dataset from '../src/data/worldcup2026.json';
import { TEAMS, MATCHES, VENUES, PLAYERS } from '../src/mock/index.js';
import { SQUADS } from '../src/data/squads.js';

const teamCodes = new Set(TEAMS.map((t) => t.code));
const venueIds = new Set(VENUES.map((v) => v.id));
const kickoffKey = (m: { date: string; time: string }) => `${m.date} ${m.time}`;

describe('Dataset: selecciones y grupos', () => {
  it('tiene exactamente 48 selecciones', () => {
    expect(TEAMS).toHaveLength(48);
  });

  it('forma 12 grupos de exactamente 4 equipos', () => {
    const byGroup = new Map<string, string[]>();
    for (const t of TEAMS) {
      const g = t.group;
      expect(g, `${t.code} sin grupo`).toBeTruthy();
      byGroup.set(g, [...(byGroup.get(g) ?? []), t.code]);
    }
    expect(byGroup.size, 'cantidad de grupos').toBe(12);
    for (const [g, codes] of byGroup) expect(codes.length, `grupo ${g}`).toBe(4);
  });

  it('incluye a México en el Grupo A', () => {
    const mex = TEAMS.find((t) => t.code === 'MEX');
    expect(mex).toBeDefined();
    expect(mex!.group).toBe('A');
  });

  it('cada selección tiene código único', () => {
    expect(teamCodes.size).toBe(TEAMS.length);
  });
});

describe('Dataset: partidos', () => {
  it('tiene los 72 partidos de fase de grupos', () => {
    expect(MATCHES).toHaveLength(72);
  });

  it('no repite ids de partido', () => {
    const ids = MATCHES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no repite el mismo enfrentamiento en la misma fecha', () => {
    const pairs = MATCHES.map((m) => `${m.home}-${m.away}-${m.date}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('todo home/away referencia una selección existente y nunca a sí misma', () => {
    for (const m of MATCHES) {
      expect(teamCodes.has(m.home), `${m.id} home=${m.home}`).toBe(true);
      expect(teamCodes.has(m.away), `${m.id} away=${m.away}`).toBe(true);
      expect(m.home, `${m.id} equipo vs sí mismo`).not.toBe(m.away);
    }
  });

  it('toda sede referenciada existe', () => {
    for (const m of MATCHES) {
      if (m.venue) expect(venueIds.has(m.venue), `${m.id} venue=${m.venue}`).toBe(true);
    }
  });

  it('el array está ordenado por fecha + hora', () => {
    for (let i = 0; i < MATCHES.length - 1; i++) {
      expect(kickoffKey(MATCHES[i]!) <= kickoffKey(MATCHES[i + 1]!), `posición ${i}`).toBe(true);
    }
  });

  it('el partido inaugural es México vs Sudáfrica', () => {
    const first = MATCHES[0]!;
    expect(first.home).toBe('MEX');
    expect(first.away).toBe('RSA');
    expect(first.date).toBe('2026-06-11');
  });
});

describe('Dataset: sedes', () => {
  it('tiene 16 sedes con id único', () => {
    expect(VENUES).toHaveLength(16);
    expect(venueIds.size).toBe(VENUES.length);
  });
});

describe('Dataset: trazabilidad (no datos fabricados)', () => {
  it('ningún partido UPCOMING trae marcador ni estadísticas inventadas', () => {
    for (const m of MATCHES.filter((x) => x.status === 'UPCOMING')) {
      expect(m.homeGoals, `${m.id} homeGoals`).toBeNull();
      expect(m.awayGoals, `${m.id} awayGoals`).toBeNull();
      expect(m.minute, `${m.id} minute`).toBeNull();
    }
  });

  it('la metadata declara fuente y licencia', () => {
    expect(dataset.meta).toBeDefined();
    expect((dataset.meta as Record<string, unknown>).source).toBeTruthy();
    expect((dataset.meta as Record<string, unknown>).license).toBeTruthy();
  });
});

describe('Cruce selecciones ↔ jugadores', () => {
  it('cada selección tiene plantilla y cada plantilla una selección', () => {
    const squadCodes = new Set(Object.keys(SQUADS));
    for (const code of teamCodes) expect(squadCodes.has(code), `${code} sin plantilla`).toBe(true);
    for (const code of squadCodes) expect(teamCodes.has(code), `${code} sin selección`).toBe(true);
  });

  it('ningún jugador queda huérfano (su equipo existe) y todos tienen club', () => {
    for (const p of PLAYERS) {
      expect(teamCodes.has(p.team), `${p.id} equipo=${p.team}`).toBe(true);
      expect(p.club.length, `${p.id} sin club`).toBeGreaterThan(0);
    }
  });
});
