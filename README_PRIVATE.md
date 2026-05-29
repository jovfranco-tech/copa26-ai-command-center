# FIFA Private World Cup Dashboard

> ⚠️ **PRIVATE · LOCAL-ONLY · NOT FOR PUBLIC DISTRIBUTION.**
> Read [`LOCAL_ONLY_NOTICE.md`](./LOCAL_ONLY_NOTICE.md) and
> [`scraper_policy.md`](./scraper_policy.md) before running anything. No official FIFA
> affiliation. No public deploy. The folder happens to be named "FIFA Vercel" — there is
> **no Vercel/cloud configuration** here and none should be added.

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
private-assets/  downloaded assets (gitignored)
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
pnpm ingest:match-stats
pnpm ingest:venues
pnpm ingest:assets        # flags / crests / player photos / venue images
pnpm ingest:all           # everything, then validate + quality report
pnpm validate:data        # Zod-validate the active dataset
pnpm report:data          # write reports/data-quality-report.md
pnpm check:local-only     # verify private dirs are gitignored
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
| `pnpm validate:data` / `pnpm report:data` | Zod validation / data-quality report |

## Safety checklist (all enforced here)

- ✅ Local API listens on `127.0.0.1` only and refuses public hosts.
- ✅ `private-assets/`, `local-db/`, `scraped-cache/`, `*.sqlite`, `*.db`,
  `reports/*.json` are gitignored. `pnpm check:local-only` verifies this.
- ✅ No official assets in `/src` or versioned `/public`; assets are served only by the
  local API from `private-assets/`, with generated placeholders when missing.
- ✅ Scrapers: public pages only, robots.txt respected, 4–10s delay, concurrency 1,
  local cache, **stop on block**, no proxies/stealth/CAPTCHA bypass.
- ✅ No cloud backend, no auth, no Vercel/Docker public config, no deploy scripts.

See [`implementation_notes.md`](./implementation_notes.md) for what's built and what's next.
