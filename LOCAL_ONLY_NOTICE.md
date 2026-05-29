# LOCAL-ONLY NOTICE

**This project is private and local-only. It is not for public distribution.**

Read this before doing anything with the repo.

## What this is

A personal dashboard that runs **only on your own computer** to browse World Cup
data and locally-downloaded assets. It is **not affiliated with FIFA** and makes no
official claim. All shipped/sample data is plausible and fictional.

## Hard rules (do not break these)

- **No public deployment.** No Vercel/Netlify/Cloud config exists here and none should
  be added. There are no deploy scripts and no public Docker setup.
- **The local API binds to loopback only** (`127.0.0.1`). It refuses to start on a
  public interface. Never expose it.
- **No official assets in git.** Flags, crests, photos and venue images live in
  `private-assets/` which is **gitignored**. Never move them into `/src` or a
  versioned `/public` folder, and never commit them.
- **No scraped dataset in git.** `scraped-cache/`, `local-db/` and all `*.sqlite`/`*.db`
  files are gitignored. Do not commit downloaded data.
- **Scraping is public-pages-only and polite.** See `scraper_policy.md`. Respect
  robots.txt, rate-limit (4–10s, concurrency 1), cache locally, and **stop on any
  block**. No login, no CAPTCHA bypass, no proxies, no anti-bot evasion. Never touch
  tickets, hospitality, accounts, purchases, or any private/authenticated area.
- **No remote backends.** No Firebase/Supabase/cloud DB. SQLite on disk only.

## If FIFA.com blocks you, changes structure, or asks for login

**Stop.** Do not try to get around it. The scrapers are written to halt and write a
report instead of pushing through. Respect that.

## Why the safeguards exist

This stays a private research/analysis tool for one person on one machine. Treat the
data and assets as local-only and disposable. If you are unsure whether something is
allowed, the answer is don't.
