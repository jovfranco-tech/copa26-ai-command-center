/**
 * Zod schemas — the single source of truth for the shape of ingested/imported
 * entities. Scrapers + normalizers must produce data that passes these schemas
 * before it is written to SQLite (see packages/ingestion/src/validators.ts).
 */
import { z } from 'zod';
import {
  ASSET_ENTITY_TYPES,
  ASSET_STATUSES,
  ASSET_TYPES,
  CONFEDERATIONS,
  EVENT_TYPES,
  MATCH_STATUSES,
  POSITIONS,
} from './constants.js';

/** A 3-letter uppercase team code, e.g. "ARG". Used as the stable domain id. */
export const TeamCode = z
  .string()
  .trim()
  .regex(/^[A-Z]{2,4}$/, 'Team code must be 2-4 uppercase letters');

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a hex color')
  .optional();

export const TeamSchema = z.object({
  id: TeamCode,
  code: TeamCode,
  name: z.string().trim().min(1),
  group: z.string().trim().min(1),
  ranking: z.number().int().positive().nullable().default(null),
  confederation: z.enum(CONFEDERATIONS).optional(),
  // Colors drive the generated crest/flag fallbacks. Optional for ingested data;
  // the normalizer fills neutral defaults when FIFA pages do not expose them.
  colorA: hexColor.default('#2a3550'),
  colorB: hexColor.default('#566080'),
  // ISO 3166-1 alpha-2 (or gb-eng/gb-sct) for rendering a real country flag.
  iso2: z.string().optional(),
  flagAssetId: z.string().nullable().default(null),
  crestAssetId: z.string().nullable().default(null),
});

export const PlayerSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  team: TeamCode,
  pos: z.enum(POSITIONS),
  posLong: z.string().trim().min(1).optional(),
  club: z.string().trim().default(''),
  age: z.number().int().min(15).max(60).nullable().default(null),
  number: z.number().int().min(1).max(99).nullable().default(null),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  minutes: z.number().int().min(0).default(0),
  yellow: z.number().int().min(0).default(0),
  red: z.number().int().min(0).default(0),
  photoAssetId: z.string().nullable().default(null),
  profileUrl: z.string().url().nullable().default(null),
});

export const MatchSchema = z.object({
  id: z.string().trim().min(1),
  group: z.string().trim().default(''),
  stage: z.string().trim().min(1),
  round: z.string().trim().default(''),
  matchday: z.number().int().min(0).default(0),
  home: TeamCode,
  away: TeamCode,
  homeGoals: z.number().int().min(0).nullable().default(null),
  awayGoals: z.number().int().min(0).nullable().default(null),
  status: z.enum(MATCH_STATUSES),
  minute: z.number().int().min(0).max(130).nullable().default(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date YYYY-MM-DD'),
  time: z.string().default(''),
  venue: z.string().trim().default(''),
  possH: z.number().int().min(0).max(100).nullable().default(null),
  shotsH: z.number().int().min(0).nullable().default(null),
  shotsA: z.number().int().min(0).nullable().default(null),
  shotsTH: z.number().int().min(0).nullable().default(null),
  shotsTA: z.number().int().min(0).nullable().default(null),
});

export const VenueSchema = z.object({
  id: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  stadium: z.string().trim().min(1),
  capacity: z.number().int().min(0).nullable().default(null),
  surface: z.string().trim().default('Grass'),
  imageAssetId: z.string().nullable().default(null),
});

export const StandingSchema = z.object({
  team: TeamCode,
  group: z.string().trim().min(1),
  P: z.number().int().min(0),
  W: z.number().int().min(0),
  D: z.number().int().min(0),
  L: z.number().int().min(0),
  GF: z.number().int().min(0),
  GA: z.number().int().min(0),
  GD: z.number().int(),
  Pts: z.number().int().min(0),
  form: z.array(z.enum(['W', 'D', 'L'])).default([]),
  rank: z.number().int().min(1).optional(),
});

export const MatchEventSchema = z.object({
  id: z.string().trim().min(1),
  matchId: z.string().trim().min(1),
  minute: z.number().int().min(0).max(130),
  stoppageTime: z.number().int().min(0).nullable().default(null),
  team: TeamCode,
  player: z.string().nullable().default(null),
  type: z.enum(EVENT_TYPES),
  description: z.string().default(''),
});

export const AssetSchema = z.object({
  id: z.string().trim().min(1),
  entityType: z.enum(ASSET_ENTITY_TYPES),
  entityId: z.string().trim().min(1),
  assetType: z.enum(ASSET_TYPES),
  sourceUrl: z.string().url().nullable().default(null),
  localPath: z.string().trim().min(1),
  mimeType: z.string().nullable().default(null),
  originalFilename: z.string().nullable().default(null),
  downloadedAt: z.string().nullable().default(null),
  status: z.enum(ASSET_STATUSES).default('present'),
});

export const schemas = {
  TeamSchema,
  PlayerSchema,
  MatchSchema,
  VenueSchema,
  StandingSchema,
  MatchEventSchema,
  AssetSchema,
} as const;
