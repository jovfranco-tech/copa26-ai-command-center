/** Mandatory local cache. Raw HTML/JSON is written here before any re-fetch. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@worldcup/db';

export const CACHE_DIR = join(REPO_ROOT, 'scraped-cache');

function dir(type: 'html' | 'json' | 'assets'): string {
  const d = join(CACHE_DIR, type);
  mkdirSync(d, { recursive: true });
  return d;
}

export function keyFor(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

export function readHtmlCache(url: string): string | null {
  const p = join(dir('html'), `${keyFor(url)}.html`);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

export function writeHtmlCache(url: string, html: string): string {
  const p = join(dir('html'), `${keyFor(url)}.html`);
  writeFileSync(p, html, 'utf8');
  return p;
}

/** Persist normalized records as raw JSON (auditable, kept out of git). */
export function writeJsonCache(name: string, data: unknown): string {
  const p = join(dir('json'), `${name}.json`);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
}
