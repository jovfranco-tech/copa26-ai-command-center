# Scraper policy

This file is binding for everything under `packages/ingestion`. The code is written to
enforce these rules; do not weaken them.

## Allowed

- Reading **public pages only** (no login, no authenticated/paywalled/private areas).
- Downloading images that are **publicly visible** on those pages (flags, crests,
  official player photos, venue images) for **local, personal** use.
- Caching raw HTML/JSON locally and storing assets under `private-assets/`.

## Forbidden (never do these)

- No scraping of **tickets, hospitality, accounts, login, checkout/purchases**, or any
  private/authenticated area.
- No **login**, no credential use, no session replay.
- No **CAPTCHA solving or bypass**.
- No **proxies**, IP rotation, or geo-evasion.
- No **anti-bot / fingerprint evasion**, no "stealth" plugins, no spoofed User-Agent.
- No **aggressive crawling**, no parallelism beyond the cap below.
- No redistribution of any scraped dataset or downloaded asset.
- No preparation for public production use.

## Operational limits (enforced in code)

| Rule | Value | Enforced by |
|---|---|---|
| Concurrency | **1** (serial) | `config.ts` clamps `maxConcurrency`; runner loops serially |
| Delay between requests | **random 4–10 s** | `lib/rate-limit.ts` (`minDelayMs` clamped ≥ 4000) |
| robots.txt | **respected** | `lib/robots.ts` — disallowed paths throw and stop the run |
| Local cache | **mandatory** | `lib/cache.ts` — re-fetch only with `INGEST_FORCE_REFETCH=1` |
| User-Agent | **honest, fixed** | `config.ts` default; never rotated or spoofed |
| On block / login wall / HTTP 401/403/4xx | **stop + report** | `lib/fetcher.ts` throws `StopError` |

## Default is "do nothing"

`ingestion_config.example.ts` ships with **no URLs and no asset targets**. Running any
`pnpm ingest:*` command with the default config fetches nothing and simply writes a
report saying so. Data is only fetched after you intentionally add public targets you
are allowed to read.

## When something breaks

If a page fails, returns an error, presents a CAPTCHA/login wall, or the DOM no longer
matches your selectors: the run **stops** and writes `reports/scraper-run-report.md`.
Fix your config or stop — do not attempt to bypass anything.
