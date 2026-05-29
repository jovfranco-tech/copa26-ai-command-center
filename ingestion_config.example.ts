/**
 * ingestion_config.example.ts
 * ----------------------------
 * Copy this file to `ingestion.config.ts` in the repo root and fill in ONLY
 * public page URLs + the CSS selectors that match that page's DOM.
 *
 * Read scraper_policy.md first. Hard rules enforced by the loader and runner:
 *   - public pages only, no login / no private areas (tickets, hospitality, accounts…)
 *   - respect robots.txt (the runner refuses disallowed paths)
 *   - random 4–10s delay, concurrency = 1, local cache before any re-fetch
 *   - NO proxies, NO stealth, NO captcha bypass, NO anti-bot evasion
 *   - if a page fails, blocks, or asks for login → the run STOPS and reports
 *
 * Everything below is EMPTY on purpose: with no URLs configured, the scripts do
 * nothing. Nothing is downloaded until you intentionally add targets you are
 * allowed to read.
 */
import type { IngestionConfig } from './packages/ingestion/src/config';

const config: IngestionConfig = {
  userAgent: 'FIFA-Private-Dashboard/0.1 (personal local research; respects robots.txt)',
  minDelayMs: 4000,
  maxDelayMs: 10000,
  maxConcurrency: 1,
  headless: true,
  forceRefetch: false,
  robotsBase: 'https://www.fifa.com',

  // ---- Public page URLs to read (leave empty to do nothing) ----
  sources: {
    fixtures: [
      // 'https://www.fifa.com/.../matches',   // a PUBLIC fixtures listing page
    ],
    teams: [
      // 'https://www.fifa.com/.../teams',
    ],
    players: [
      // 'https://www.fifa.com/.../teams/<team>/squad',
    ],
    playerProfiles: [
      // 'https://www.fifa.com/.../players/<player>',
    ],
    matchStats: [
      // 'https://www.fifa.com/.../matches/<match>/statistics',
    ],
    venues: [
      // 'https://www.fifa.com/.../venues',
    ],
  },

  // ---- Selectors (must be adjusted to the REAL public DOM you are reading) ----
  // `item` matches each row/card; `fields` are sub-selectors relative to it.
  selectors: {
    fixtures: {
      item: '[data-match]',
      fields: {
        home: '[data-home]',
        away: '[data-away]',
        date: 'time',
        // homeScore: '[data-home-score]',
        // awayScore: '[data-away-score]',
      },
    },
    teams: {
      item: '[data-team]',
      fields: { name: '[data-name]', code: '[data-code]', group: '[data-group]' },
    },
  },

  // ---- Public image URLs to download locally (leave empty to do nothing) ----
  // entityId = team code / player id / venue id the asset belongs to.
  assets: {
    flags: [
      // { entityId: 'ARG', url: 'https://.../public/flags/arg.svg' },
    ],
    crests: [
      // { entityId: 'ARG', url: 'https://.../public/crests/arg.svg' },
    ],
    playerPhotos: [
      // { entityId: 'P001', url: 'https://.../public/players/p001.jpg' },
    ],
    venueImages: [
      // { entityId: 'nyc', url: 'https://.../public/venues/nyc.jpg' },
    ],
  },
};

export default config;
