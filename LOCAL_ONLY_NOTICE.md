# LOCAL-ONLY NOTICE

**This project is private and personal-use only. It is not for public distribution.**

Read this before doing anything with the repo.

## What this is

A personal dashboard that runs locally and as a password-gated private Vercel deploy
to browse World Cup data and downloaded assets. It is **not affiliated with FIFA** and
makes no official claim.

## Hard rules (do not break these)

- **No public deployment.** The Vercel deployment is private and gated by Edge
  middleware. Do not make it public without an explicit privacy review.
- **The local API binds to loopback only** (`127.0.0.1`). It refuses to start on a
  public interface. Never expose it.
- **Raw assets stay local.** Original flags, crests, photos and venue images live in
  `private-assets/` which is **gitignored**. Only optimized static derivatives for the
  private deployment may live under `apps/web/static/`.
- **No scraped dataset in git.** `scraped-cache/`, `local-db/` and all `*.sqlite`/`*.db`
  files are gitignored. Do not commit downloaded data.
- **Scraping is public-pages-only and polite.** See `scraper_policy.md`. Respect
  robots.txt, rate-limit (4–10s, concurrency 1), cache locally, and **stop on any
  block**. No login, no CAPTCHA bypass, no proxies, no anti-bot evasion. Never touch
  tickets, hospitality, accounts, purchases, or any private/authenticated area.
- **No remote database.** SQLite/local files remain the source; Vercel serves the
  private frontend and lightweight serverless endpoints.

## If FIFA.com blocks you, changes structure, or asks for login

**Stop.** Do not try to get around it. The scrapers are written to halt and write a
report instead of pushing through. Respect that.

## Why the safeguards exist

This stays a private research/analysis tool for one person on one machine. Treat the
data and assets as local-only and disposable. If you are unsure whether something is
allowed, the answer is don't.
