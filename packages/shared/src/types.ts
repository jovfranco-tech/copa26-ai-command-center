/**
 * Domain types. The 7 ingested entities are inferred from the Zod schemas so the
 * validation layer and the type layer can never drift. UI-only and API-envelope
 * types are declared explicitly below.
 */
import type { z } from 'zod';
import type {
  AssetSchema,
  MatchEventSchema,
  MatchSchema,
  PlayerSchema,
  StandingSchema,
  TeamSchema,
  VenueSchema,
} from './schemas.js';
import type { DataSourceKind } from './constants.js';

export type Team = z.infer<typeof TeamSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type StandingRow = z.infer<typeof StandingSchema>;
export type MatchEvent = z.infer<typeof MatchEventSchema>;
export type Asset = z.infer<typeof AssetSchema>;

export interface Goalkeeper {
  id: string;
  name: string;
  team: string;
  saves: number;
  cleanSheets: number;
  pos: 'GK';
}

/** Cosmetic local-only cues surfaced in the SyncCard + topbar pill. */
export interface CacheMeta {
  lastSync: string;
  cacheStatus: string;
  assets: { crests: number; photos: number; venues: number; flags: number };
  db: string;
  sizeMB: number;
  source: DataSourceKind;
}

/** Standard envelope every list endpoint returns, so the UI knows the source. */
export interface ApiList<T> {
  source: DataSourceKind;
  count: number;
  items: T[];
}

export interface ApiItem<T> {
  source: DataSourceKind;
  item: T | null;
}

/** Payload for GET /api/stats. */
export interface StatsBundle {
  source: DataSourceKind;
  topScorers: Player[];
  topAssists: Player[];
  topCards: Player[];
  goalkeepers: Goalkeeper[];
  teamGoals: Array<{ team: string; goals: number }>;
  teamPossession: Array<{ team: string; possession: number }>;
  teamShots: Array<{ team: string; shots: number }>;
}

/** Payload for GET /api/sync/status. */
export interface SyncStatus {
  source: DataSourceKind;
  meta: CacheMeta;
  lastRun: SyncRun | null;
  dbExists: boolean;
  assetsTracked: number;
}

export interface SyncRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  source: string;
  recordsCreated: number;
  recordsUpdated: number;
  assetsDownloaded: number;
  errorsCount: number;
}

/** Focus context the Match Analyst can be pointed at. */
export interface AnalystContext {
  kind: 'tournament' | 'match' | 'team' | 'player';
  id?: string;
}
