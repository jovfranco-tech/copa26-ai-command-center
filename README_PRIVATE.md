# FIFA Private World Cup Dashboard

> ⚠️ **PRIVATE · PERSONAL USE · NOT FOR PUBLIC DISTRIBUTION.**
> Read [`LOCAL_ONLY_NOTICE.md`](./LOCAL_ONLY_NOTICE.md) and
> [`scraper_policy.md`](./scraper_policy.md) before running anything. No official FIFA
> affiliation. Production is a password-protected private Vercel deploy.

A personal "sports intelligence command center" for browsing World Cup matches, teams,
players, standings, stats, the bracket and venues — running entirely on your machine.
It works out of the box on **typed mock data**, and can be loaded with your own
locally-ingested data + assets.

## Stack

pnpm workspaces · React + Vite + TypeScript · Tailwind · TanStack Router + Query ·
Zustand · SQLite (libsql) + Drizzle ORM · Hono local API · Playwright (controlled,
public-only scraping) · Zod · lucide-react · Recharts.

## Layout

```
apps/
  web/         React + Vite UI (dark premium command center)
  local-api/   Hono API — reads SQLite, serves local assets, loopback only
packages/
  shared/      types, Zod schemas, constants, formatters, standings, mock data
  db/          Drizzle schema, libsql client, migrate + seed
  ingestion/   scrapers, asset downloader, normalizers, validators, reports
  ui/          shared presentational primitives + icon adapter
private-assets/  raw downloaded assets (gitignored)
apps/web/static/ optimized static derivatives for the private deploy
local-db/        worldcup.sqlite (gitignored)
scraped-cache/   raw html/json + downloaded asset cache (gitignored)
reports/         generated markdown reports
design-prototype/ the approved Claude Design prototype (reference only)
```

## Quick start

```bash
pnpm install
pnpm dev          # starts web (http://127.0.0.1:5173) + local API (127.0.0.1:8787)
```

On first run there is no SQLite file, so the app serves **mock data** and shows a
banner: _"Using mock data. Run ingestion scripts to load local FIFA data."_ Everything
is fully navigable in this mode.

### Load the local database (optional)

```bash
pnpm db:generate   # generate SQL migrations from the Drizzle schema (first time)
pnpm db:migrate    # create/upgrade local-db/worldcup.sqlite
pnpm db:seed       # populate it from the typed mock dataset
```

After seeding, the API serves from SQLite (the banner disappears).

### Ingest real data + assets (optional, advanced)

1. Read `scraper_policy.md`.
2. Copy `ingestion_config.example.ts` → `ingestion.config.ts` and add **public** page
   URLs, selectors, and asset URLs you are allowed to read. (With the default empty
   config, the commands below do nothing.)
3. Install the Playwright browser once: `pnpm --filter @worldcup/ingestion exec playwright install chromium`
4. Run what you need:

```bash
pnpm ingest:teams
pnpm ingest:fixtures
pnpm ingest:players
pnpm ingest:player-profiles
pnpm ingest:player-photos              # configured public photo URLs in ingestion.config.ts
pnpm ingest:player-photos:wikimedia    # resolve free Wikimedia photos from Wikidata P18
pnpm ingest:match-stats
pnpm ingest:venues
pnpm ingest:assets        # flags / crests / player photos / venue images
pnpm assets:intel         # optimized player/venue/coach images + weather/venue data packs
pnpm ingest:all           # everything, then validate + quality report
pnpm validate:data        # Zod-validate the active dataset
pnpm report:data          # write reports/data-quality-report.md
pnpm check:local-only     # verify private dirs are gitignored
```

If Wikimedia rate-limits image downloads, wait for its `Retry-After` window and resume
in small batches, for example:

```bash
PLAYER_PHOTO_DOWNLOAD_LIMIT=8 pnpm ingest:player-photos:wikimedia
```

## All scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + local API in parallel |
| `pnpm build` | Typecheck all packages + build the web bundle |
| `pnpm lint` | ESLint across the workspace |
| `pnpm db:migrate` | Apply migrations to local SQLite |
| `pnpm db:seed` | Seed SQLite from mock data |
| `pnpm ingest:*` | Controlled, public-only ingestion (see above) |
| `pnpm assets:intel` | Generates private-deployable WebP assets and data packs from free/public sources |
| `pnpm validate:data` / `pnpm report:data` | Zod validation / data-quality report |

## Family pool persistence

The quiniela persists across devices through Cloud Firestore. The browser writes
`poolPicks/{playerName}` directly with Firebase's offline cache, and the service
worker can retry `/api/pool/sync` after reconnecting. Keep `firestore.rules` deployed
before sharing the production link:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`/api/pool/status` and the Data Center verify the Firestore connection used by the
family leaderboard.

## Results pipeline

`/api/data-sync` is cron-protected with `CRON_SECRET`. Before kickoff it reports readiness.
After `2026-06-11`, set `RESULTS_SOURCE_URL` to an authorized JSON feed of match results;
the cron will validate reachability and flag the next ingestion/redeploy action. It does
not scrape blocked FIFA pages or invent scores.

## Monitoring

`/api/monitoring` reports AI, quiniela and sync counters. If Vercel KV / Upstash REST
environment variables are present (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the
`UPSTASH_REDIS_*` equivalents), counters are durable; otherwise they are best-effort
per-function memory plus Vercel logs.

## Safety checklist (all enforced here)

- ✅ Local API listens on `127.0.0.1` only and refuses public hosts.
- ✅ `private-assets/`, `local-db/`, `scraped-cache/`, `*.sqlite`, `*.db`,
  `reports/*.json` are gitignored. `pnpm check:local-only` verifies this.
- ✅ Raw downloaded assets stay in `private-assets/`; optimized static derivatives in
  `apps/web/static/` keep the private Vercel deploy reproducible and lightweight.
- ✅ Scrapers: public pages only, robots.txt respected, 4–10s delay, concurrency 1,
  local cache, **stop on block**, no proxies/stealth/CAPTCHA bypass.
- ✅ Private Vercel deploy is gated by the Edge middleware access screen; API routes stay
  behind the same gate.

See [`implementation_notes.md`](./implementation_notes.md) for what's built and what's next.
