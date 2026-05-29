/**
 * Drizzle schema — local SQLite store for the private dashboard.
 *
 * Columns follow the required data model 1:1. The only additions are two
 * design-fallback color columns on `teams` (color_a / color_b) used to render
 * the generated crest/flag placeholders when no local asset exists. They hold
 * UI colors, never official data.
 */
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fifaId: text('fifa_id'),
  name: text('name').notNull(),
  slug: text('slug'),
  countryCode: text('country_code').notNull(),
  groupName: text('group_name'),
  ranking: integer('ranking'),
  flagAssetId: text('flag_asset_id'),
  crestAssetId: text('crest_asset_id'),
  // design-fallback only:
  colorA: text('color_a'),
  colorB: text('color_b'),
  confederation: text('confederation'),
});

export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fifaId: text('fifa_id'),
  teamId: integer('team_id').references(() => teams.id),
  name: text('name').notNull(),
  slug: text('slug'),
  position: text('position'),
  club: text('club'),
  age: integer('age'),
  shirtNumber: integer('shirt_number'),
  photoAssetId: text('photo_asset_id'),
  profileUrl: text('profile_url'),
  // tournament aggregates (kept here so the players grid works without joins)
  goals: integer('goals').default(0),
  assists: integer('assists').default(0),
  minutes: integer('minutes').default(0),
  yellowCards: integer('yellow_cards').default(0),
  redCards: integer('red_cards').default(0),
});

export const venues = sqliteTable('venues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fifaId: text('fifa_id'),
  name: text('name').notNull(),
  city: text('city'),
  country: text('country'),
  capacity: integer('capacity'),
  surface: text('surface'),
  imageAssetId: text('image_asset_id'),
});

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fifaId: text('fifa_id'),
  homeTeamId: integer('home_team_id').references(() => teams.id),
  awayTeamId: integer('away_team_id').references(() => teams.id),
  dateUtc: text('date_utc'),
  localTime: text('local_time'),
  venueId: integer('venue_id').references(() => venues.id),
  city: text('city'),
  stage: text('stage'),
  groupName: text('group_name'),
  status: text('status'),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  minute: integer('minute'),
  matchday: integer('matchday'),
  possessionHome: integer('possession_home'),
  shotsHome: integer('shots_home'),
  shotsAway: integer('shots_away'),
  shotsTargetHome: integer('shots_target_home'),
  shotsTargetAway: integer('shots_target_away'),
  matchUrl: text('match_url'),
});

export const standings = sqliteTable('standings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').references(() => teams.id),
  groupName: text('group_name'),
  played: integer('played').default(0),
  wins: integer('wins').default(0),
  draws: integer('draws').default(0),
  losses: integer('losses').default(0),
  goalsFor: integer('goals_for').default(0),
  goalsAgainst: integer('goals_against').default(0),
  goalDifference: integer('goal_difference').default(0),
  points: integer('points').default(0),
  rank: integer('rank'),
});

export const matchEvents = sqliteTable('match_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id').references(() => matches.id),
  minute: integer('minute'),
  stoppageTime: integer('stoppage_time'),
  teamId: integer('team_id').references(() => teams.id),
  playerId: integer('player_id').references(() => players.id),
  eventType: text('event_type'),
  description: text('description'),
});

export const teamStats = sqliteTable('team_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').references(() => teams.id),
  matchId: integer('match_id').references(() => matches.id),
  possession: integer('possession'),
  shots: integer('shots'),
  shotsOnTarget: integer('shots_on_target'),
  passes: integer('passes'),
  corners: integer('corners'),
  fouls: integer('fouls'),
  yellowCards: integer('yellow_cards'),
  redCards: integer('red_cards'),
});

export const playerStats = sqliteTable('player_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').references(() => players.id),
  matchId: integer('match_id').references(() => matches.id),
  minutes: integer('minutes'),
  goals: integer('goals'),
  assists: integer('assists'),
  shots: integer('shots'),
  shotsOnTarget: integer('shots_on_target'),
  passes: integer('passes'),
  saves: integer('saves'),
  yellowCards: integer('yellow_cards'),
  redCards: integer('red_cards'),
});

export const assetRegistry = sqliteTable('asset_registry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  assetType: text('asset_type').notNull(),
  sourceUrl: text('source_url'),
  localPath: text('local_path').notNull(),
  mimeType: text('mime_type'),
  originalFilename: text('original_filename'),
  downloadedAt: text('downloaded_at').default(sql`(current_timestamp)`),
  status: text('status').default('present'),
});

export const syncRuns = sqliteTable('sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').default(sql`(current_timestamp)`),
  finishedAt: text('finished_at'),
  status: text('status'),
  source: text('source'),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  assetsDownloaded: integer('assets_downloaded').default(0),
  errorsCount: integer('errors_count').default(0),
});

export type TeamRow = typeof teams.$inferSelect;
export type PlayerRow = typeof players.$inferSelect;
export type VenueRow = typeof venues.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type StandingRowDb = typeof standings.$inferSelect;
export type MatchEventRow = typeof matchEvents.$inferSelect;
export type AssetRow = typeof assetRegistry.$inferSelect;
export type SyncRunRow = typeof syncRuns.$inferSelect;
