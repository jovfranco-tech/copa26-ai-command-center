import { describe, it, expect } from 'vitest';
import { SQUADS } from '../src/data/squads.js';
import { PLAYERS } from '../src/mock/index.js';

const POSITIONS = new Set(['GK', 'DF', 'MF', 'FW']);

describe('Integridad de plantillas (SQUADS)', () => {
  const entries = Object.entries(SQUADS);

  it('incluye las 48 selecciones clasificadas', () => {
    expect(entries).toHaveLength(48);
  });

  it('cada selección tiene un XI completo (11-12 jugadores)', () => {
    for (const [code, squad] of entries) {
      expect(squad.length, code).toBeGreaterThanOrEqual(11);
      expect(squad.length, code).toBeLessThanOrEqual(26);
    }
  });

  it('cada entrada tiene formato válido [nombre, pos, club, edad, dorsal]', () => {
    for (const [code, squad] of entries) {
      for (const e of squad) {
        expect(e, code).toHaveLength(5);
        const [name, pos, club, age, num] = e;
        expect(typeof name, `${code} nombre`).toBe('string');
        expect(name.length, `${code} ${name}`).toBeGreaterThan(0);
        expect(POSITIONS.has(pos), `${code} ${name} pos=${pos}`).toBe(true);
        expect(typeof club, `${code} ${name} club`).toBe('string');
        expect(club.length, `${code} ${name}`).toBeGreaterThan(0);
        expect(age, `${code} ${name} edad`).toBeGreaterThan(14);
        expect(age, `${code} ${name} edad`).toBeLessThan(50);
        expect(num, `${code} ${name} dorsal`).toBeGreaterThanOrEqual(1);
        expect(num, `${code} ${name} dorsal`).toBeLessThanOrEqual(99);
      }
    }
  });

  it('no repite dorsales dentro de una misma selección', () => {
    for (const [code, squad] of entries) {
      const nums = squad.map((e) => e[4]);
      expect(new Set(nums).size, `${code} dorsales=${nums.join(',')}`).toBe(nums.length);
    }
  });

  it('cada selección tiene al menos un portero (para el slot de arquero del estadio)', () => {
    for (const [code, squad] of entries) {
      expect(squad.some((e) => e[1] === 'GK'), `${code} sin GK`).toBe(true);
    }
  });

  it('cada selección tiene suficientes jugadores de campo para un XI', () => {
    for (const [code, squad] of entries) {
      const outfield = squad.filter((e) => e[1] !== 'GK').length;
      expect(outfield, code).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('PLAYERS derivados de SQUADS', () => {
  it('genera ids únicos con formato {EQUIPO}-{n}', () => {
    const ids = PLAYERS.map((p) => p.id);
    expect(new Set(ids).size, 'ids duplicados').toBe(ids.length);
    for (const id of ids) expect(id, `id=${id}`).toMatch(/^[A-Z]{3}-\d+$/);
  });

  it('numera a cada equipo de forma secuencial desde 1', () => {
    const byTeam = new Map<string, number[]>();
    for (const p of PLAYERS) {
      const [team, idx] = p.id.split('-');
      if (!byTeam.has(team!)) byTeam.set(team!, []);
      byTeam.get(team!)!.push(Number(idx));
    }
    for (const [team, idxs] of byTeam) {
      const sorted = [...idxs].sort((a, b) => a - b);
      expect(sorted[0], team).toBe(1);
      expect(sorted[sorted.length - 1], team).toBe(sorted.length);
    }
  });

  it('arranca con estadísticas de torneo en cero (aún no se juega)', () => {
    for (const p of PLAYERS) {
      expect(p.goals).toBe(0);
      expect(p.assists).toBe(0);
    }
  });
});
