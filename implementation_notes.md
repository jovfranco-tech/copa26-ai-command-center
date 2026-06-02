# Implementation notes

Status of v0.1 of the **FIFA Private World Cup Dashboard** (private, local-only).

## What was built

### Monorepo (pnpm workspaces)
- `apps/web` — React 18 + Vite + TS + Tailwind UI (dark premium command center).
- `apps/local-api` — Hono API, **loopback-only**, SQLite-with-mock-fallback, asset server.
- `packages/shared` — types, **Zod schemas**, constants, formatters, standings logic,
  selectors, and the typed **mock dataset** (48 teams / 12 groups / 16 venues).
- `packages/db` — **Drizzle** schema (all required tables), libsql client, migrate, seed.
- `packages/ingestion` — Playwright scrapers, asset downloader, normalizers, validators,
  reporters — all behind the policy in `scraper_policy.md`.
- `packages/ui` — shared presentational primitives + lucide-react icon adapter.

### Screens (all implemented, navigable on mock data)
Dashboard · Match Center (filters: date/group/team/stage/venue/status) · Match Detail
(events / lineups / statistics + "Ask Analyst") · Teams · Team Detail · Players (filters)
· Player Detail (metrics, percentile bars, comparison) · Groups & Standings · Stats
(players / keepers / teams + Recharts) · Bracket (projected) · Venues · Favorites
(teams/players/matches/notes) · Match Analyst (grounded, local-only answers).

### Data layer
- TanStack Query hooks: `useTeams/useTeam`, `usePlayers/usePlayer`, `useMatches/useMatch`,
  `useStandings`, `useStats`, `useVenues`, `useSyncStatus`, `useAsset`.
- Zustand stores: `preferences` (theme/density/accent/font, persisted + applied to `:root`),
  `favorites` (+ notes, persisted), `filters` (match + player).
- API client falls back to bundled mock data if the API process is down, so the UI always
  renders.

### Local API endpoints
`/api/teams`, `/api/teams/:id`, `/api/players`, `/api/players/:id`, `/api/matches`,
`/api/matches/:id`, `/api/venues`, `/api/standings`, `/api/stats`, `/api/assets/:assetId`,
`/api/sync/status`, `/api/health`. Every list response carries `source: 'mock' | 'sqlite'`.

### Ingestion (controlled, public-only)
- Config-driven (`ingestion_config.example.ts`). **Empty by default → every script is a
  no-op** until you add public URLs/selectors.
- Enforced: robots.txt check, random 4–10s delay, concurrency 1, mandatory local cache,
  honest fixed User-Agent, **stop + report on any block/login/CAPTCHA**. No proxies, no
  stealth, no bypass.
- Asset downloader saves to `private-assets/`, records every file in `asset_registry`
  with full metadata, and links it to its entity.
- Reports written to `/reports`: `scraper-run-report.md`, `asset-download-report.md`,
  `data-quality-report.md`.

## Verification performed (this build)

| Check | Result |
|---|---|
| `pnpm install` | ✅ 342 pkgs (esbuild build approved in `pnpm-workspace.yaml`) |
| `pnpm build` | ✅ all packages typecheck; web bundle builds |
| `pnpm lint` | ✅ 0 errors, 0 warnings |
| `pnpm db:generate` + `db:migrate` + `db:seed` | ✅ 10 tables, 48 teams / 46 players / 72 matches / 96 assets |
| API serves from SQLite | ✅ `source=sqlite` on all endpoints |
| API mock fallback (no SQLite) | ✅ `source=mock`, `dbExists=false`, no DB file created |
| API binds loopback only | ✅ `lsof` shows `127.0.0.1:8787`; refuses `0.0.0.0` and exits 1 |
| Asset endpoint | ✅ serves local SVG (`image/svg+xml`) via registry id, path-contained |
| `validate:data` | ✅ all schemas pass (Team/Venue/Player/Match/Standing) |
| `report:data` / `ingest:all` | ✅ no-op safe default, reports generated |
| `.gitignore` | ✅ `git check-ignore` confirms private-assets/, local-db/, scraped-cache/, .env.local, reports/*.json excluded; nothing sensitive staged |
| Official assets in `/src` or `/public` | ✅ none; no versioned `public/` exists |

## Deliberate deviations / additions (documented in data_model.md)
- `teams.color_a/color_b` columns — UI fallback colors only (generated crest/flag), never
  official data.
- Aggregate stat columns on `players`/`matches` so v0.1 grids work without joins.
- `GET /api/venues` added (not in the original endpoint list) to power the Venues screen.
- `pnpm db:seed` added to exercise the SQLite path without scraping.
- The prototype's custom icon set is mapped onto **lucide-react** (stack requirement) via
  an `Icon` adapter, preserving the prototype's icon-name API.

## Pending / next steps (not in v0.1)
- **Real ingestion mapping:** the scraper normalizers + selectors are generic scaffolding.
  Wiring a real public source means setting selectors in `ingestion.config.ts` and likely
  refining `packages/ingestion/src/normalizers`. Install the browser first:
  `pnpm --filter @worldcup/ingestion exec playwright install chromium`.
- **Match events & lineups from data:** events are seeded (goals only); lineups currently
  render the squad. Real per-match `match_events` / `team_stats` / `player_stats` ingestion
  is modeled in the schema but not yet populated by scrapers.
- **Goalkeeper stats in SQLite mode:** GK saves aren't first-class in the required schema,
  so the keepers leaderboard is populated in mock mode only.
- **Bracket from results:** currently a projection by FIFA ranking; could be derived from
  real knockout results once ingested.
- **Code-splitting:** the web bundle is ~815 kB (Recharts). Fine for local use; could be
  split if desired.
- **Per-entity scraper reports:** all scrapers currently write `scraper-run-report.md`
  (last run wins). Could split into per-entity report files.

## Guardrails recap (all enforced)
Personal-use only · family-shareable Vercel deploy without global password · remote AI
rate-limited · raw assets gitignored · optimized static derivatives only for deploy ·
scrapers polite, robots-respecting, stop-on-block, no proxies/stealth/bypass. See
`LOCAL_ONLY_NOTICE.md` and `scraper_policy.md`.
