/**
 * Page fetcher built on Playwright. Deliberately plain: honest User-Agent, no
 * proxy, no stealth, no fingerprint spoofing, no CAPTCHA handling. It checks
 * robots.txt, uses the local cache, rate-limits, and STOPS on any block.
 */
import { chromium, type Browser } from 'playwright';
import type { EntitySelectors, IngestionConfig } from '../config.js';
import { readHtmlCache, writeHtmlCache } from './cache.js';
import { StopError } from './errors.js';
import type { Logger } from './logger.js';
import { politeDelay } from './rate-limit.js';
import type { RobotsChecker } from './robots.js';

let browser: Browser | null = null;

async function getBrowser(cfg: IngestionConfig): Promise<Browser> {
  if (browser) return browser;
  // No proxy, no extra args that would evade detection. Just headless Chromium.
  browser = await chromium.launch({ headless: cfg.headless });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

const BLOCK_SIGNS = ['captcha', 'are you a robot', 'please sign in', 'log in to continue', 'access denied'];

export async function fetchPage(
  url: string,
  cfg: IngestionConfig,
  robots: RobotsChecker,
  log: Logger,
): Promise<string> {
  if (!(await robots.allowed(url))) {
    throw new StopError(`robots.txt disallows ${url} — stopping (no override).`);
  }

  const cached = readHtmlCache(url);
  if (cached && !cfg.forceRefetch) {
    log.info(`cache hit → ${url}`);
    return cached;
  }

  const waited = await politeDelay(cfg);
  log.info(`fetching (after ${waited}ms) → ${url}`);

  const b = await getBrowser(cfg);
  const ctx = await b.newContext({ userAgent: cfg.userAgent });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const status = resp?.status() ?? 0;
    if (status === 401 || status === 403) {
      throw new StopError(`blocked (HTTP ${status}) at ${url} — stopping per policy.`);
    }
    if (status >= 400) {
      throw new StopError(`HTTP ${status} at ${url} — stopping per policy.`);
    }
    const html = await page.content();
    const lower = html.toLowerCase();
    if (BLOCK_SIGNS.some((s) => lower.includes(s))) {
      throw new StopError(`login/CAPTCHA/anti-bot wall detected at ${url} — stopping (no bypass).`);
    }
    writeHtmlCache(url, html);
    return html;
  } catch (err) {
    if (err instanceof StopError) throw err;
    throw new StopError(`navigation failed for ${url}: ${(err as Error).message}`);
  } finally {
    await ctx.close();
  }
}

/**
 * Parse already-fetched HTML (offline) using the configured selectors. Each
 * `selectors.item` becomes one record; `selectors.fields` pull text/attributes.
 */
export async function extractRecords(
  html: string,
  selectors: EntitySelectors,
  cfg: IngestionConfig,
): Promise<Array<Record<string, string>>> {
  const b = await getBrowser(cfg);
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return await page.$$eval(
      selectors.item,
      (els: Element[], fields: Record<string, string>) =>
        els.map((el) => {
          const rec: Record<string, string> = {};
          for (const k of Object.keys(fields)) {
            const f = el.querySelector(fields[k]!);
            rec[k] = (f?.textContent ?? f?.getAttribute('content') ?? '').trim();
          }
          return rec;
        }),
      selectors.fields,
    );
  } finally {
    await ctx.close();
  }
}
