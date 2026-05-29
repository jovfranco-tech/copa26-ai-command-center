# Data model

Two layers:

1. **Domain shape** (`packages/shared`) — what the API returns and the UI consumes.
   The 7 ingested entities are defined as Zod schemas and the TS types are inferred from
   them, so validation and types never drift.
2. **Storage shape** (`packages/db`) — the normalized SQLite tables (Drizzle). The API
   maps rows ↔ domain objects.

## Zod schemas (validation = source of truth)

`TeamSchema`, `PlayerSchema`, `MatchSchema`, `VenueSchema`, `StandingSchema`,
`MatchEventSchema`, `AssetSchema` (see `packages/shared/src/schemas.ts`). Anything
ingested must pass these before it is written to SQLite.

## SQLite tables (`packages/db/src/schema.ts`)

Columns follow the required model 1:1. The only additions are noted.

| Table | Key columns |
|---|---|
| `teams` | id, fifa_id, name, slug, country_code, group_name, ranking, flag_asset_id, crest_asset_id, **color_a/color_b** (UI fallback only), confederation |
| `players` | id, fifa_id, team_id→teams, name, slug, position, club, age, shirt_number, photo_asset_id, profile_url, **goals/assists/minutes/yellow_cards/red_cards** (aggregates so the grid needs no joins) |
| `matches` | id, fifa_id, home_team_id, away_team_id, date_utc, local_time, venue_id, city, stage, group_name, status, home_score, away_score, **minute/matchday/possession_home/shots_* ** (light stats), match_url |
| `venues` | id, fifa_id, name, city, country, capacity, surface, image_asset_id |
| `standings` | id, team_id, group_name, played, wins, draws, losses, goals_for, goals_against, goal_difference, points, rank |
| `match_events` | id, match_id, minute, stoppage_time, team_id, player_id, event_type, description |
| `team_stats` | id, team_id, match_id, possession, shots, shots_on_target, passes, corners, fouls, yellow_cards, red_cards |
| `player_stats` | id, player_id, match_id, minutes, goals, assists, shots, shots_on_target, passes, saves, yellow_cards, red_cards |
| `asset_registry` | id, entity_type, entity_id, asset_type, source_url, local_path, mime_type, original_filename, downloaded_at, status |
| `sync_runs` | id, started_at, finished_at, status, source, records_created, records_updated, assets_downloaded, errors_count |

> **Additions vs the base spec:** `teams.color_a/color_b` (placeholder rendering only),
> per-entity aggregate columns on `players`/`matches` (so v0.1 screens work without
> joins), and `asset_registry.original_filename`. These are additive and documented.

## Id bridging (storage ↔ domain)

- Integer PKs are internal. The **domain id** is stored in `fifa_id` (teams use the
  3-letter `country_code` as their domain id, e.g. `ARG`; players `P001`; matches
  `M001`; venues `nyc`).
- Foreign keys (`home_team_id`, `venue_id`, …) reference the integer PKs. The API
  resolves them back to domain ids when mapping rows → DTOs (`apps/local-api/src/data-source.ts`).

## Standings are derived

Never trusted from storage blindly. `computeStandings()` rebuilds them from finished
matches (3 pts win / 1 draw; tiebreak Pts → GD → GF). The `standings` table is seeded
for completeness, but `/api/standings` recomputes.

## Assets

Files live under `private-assets/<type>/` (gitignored). Each is recorded in
`asset_registry` with `source_url`, `downloaded_at`, `local_path`, `asset_type`,
`entity_type`, `entity_id`, `original_filename`, `mime_type`, `status`. The owning row
(team/player/venue) stores the registry id in its `*_asset_id` column. Assets are served
**only** by the local API at `GET /api/assets/:assetId`; the UI shows a generated
placeholder when an asset id is absent.

## API envelope

List endpoints return `{ source: 'mock' | 'sqlite', count, items }`; item endpoints
`{ source, item }`. `source` drives the mock-data banner in the UI.
