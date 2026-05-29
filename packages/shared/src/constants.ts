/**
 * Tournament-wide constants shared across the local app.
 * No official affiliation — plausible 2026-style structure (48 teams / 12 groups).
 */

export const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

export const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LONG: Record<Position, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MF: 'Midfielder',
  FW: 'Forward',
};

export const MATCH_STATUSES = ['UPCOMING', 'LIVE', 'FT'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const;
export type Confederation = (typeof CONFEDERATIONS)[number];

export const EVENT_TYPES = [
  'goal',
  'own_goal',
  'penalty',
  'yellow',
  'red',
  'sub',
  'var',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Asset registry vocabulary (kept in sync with the DB asset_registry table). */
export const ASSET_ENTITY_TYPES = ['team', 'player', 'venue', 'fifa'] as const;
export type AssetEntityType = (typeof ASSET_ENTITY_TYPES)[number];

export const ASSET_TYPES = ['flag', 'crest', 'photo', 'venue_image', 'logo'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_STATUSES = ['present', 'missing', 'error', 'placeholder'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Where the API served its data from — drives the "mock data" banner in the UI. */
export type DataSourceKind = 'mock' | 'sqlite';

/** Local-only network defaults. The API must never bind to a public interface. */
export const LOCAL_ONLY = {
  defaultApiHost: '127.0.0.1',
  defaultApiPort: 8787,
  /** Hosts the API is allowed to bind to. Anything else is a configuration error. */
  allowedHosts: ['127.0.0.1', 'localhost', '::1'],
} as const;

export const FOOTER_NOTICE = 'Private local dashboard. Not for public distribution.';
export const ANALYST_DISCLAIMER = 'Answers based on local cached data.';
export const MOCK_BANNER =
  'Using mock data. Run ingestion scripts to load local FIFA data.';
