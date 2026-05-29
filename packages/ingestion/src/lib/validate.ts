/** Validate a dataset against the shared Zod schemas. */
import {
  MatchSchema,
  PlayerSchema,
  StandingSchema,
  TeamSchema,
  VenueSchema,
  computeStandings,
  groupTable,
  type StandingRow,
} from '@worldcup/shared';
import type { z } from 'zod';
import { loadSources, type Sources } from './load-sources.js';

export interface EntityValidation {
  entity: string;
  total: number;
  valid: number;
  invalid: number;
  errors: string[];
}

function validateArray<T>(entity: string, schema: z.ZodType<T>, rows: unknown[]): EntityValidation {
  let valid = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const r = schema.safeParse(row);
    if (r.success) valid++;
    else errors.push(`${entity}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  }
  return { entity, total: rows.length, valid, invalid: rows.length - valid, errors };
}

export interface ValidationResult {
  source: Sources['source'];
  entities: EntityValidation[];
  totalInvalid: number;
}

export function runValidation(): ValidationResult {
  const s = loadSources();
  const standingsTable = computeStandings(s.teams, s.matches);
  const standings: StandingRow[] = [...new Set(s.teams.map((t) => t.group))].flatMap((g) =>
    groupTable(g, standingsTable),
  );

  const entities: EntityValidation[] = [
    validateArray('TeamSchema', TeamSchema, s.teams),
    validateArray('VenueSchema', VenueSchema, s.venues),
    validateArray('PlayerSchema', PlayerSchema, s.players),
    validateArray('MatchSchema', MatchSchema, s.matches),
    validateArray('StandingSchema', StandingSchema, standings),
  ];
  const totalInvalid = entities.reduce((n, e) => n + e.invalid, 0);
  return { source: s.source, entities, totalInvalid };
}
