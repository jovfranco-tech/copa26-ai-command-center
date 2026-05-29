/** Resolve local paths against the repo root, regardless of the process cwd. */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Walk up from this file until we find the pnpm workspace root. */
export function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume packages/db/src -> repo root is three levels up.
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

export const REPO_ROOT = findRepoRoot();
export const LOCAL_DB_DIR = join(REPO_ROOT, 'local-db');
export const DEFAULT_DB_FILE = join(LOCAL_DB_DIR, 'worldcup.sqlite');

/** Absolute filesystem path of the SQLite file (honors DATABASE_URL). */
export function resolveDbFilePath(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return DEFAULT_DB_FILE;
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
  return isAbsolute(raw) ? raw : resolve(REPO_ROOT, raw);
}

/** libsql connection string (always a file: URL pointing inside the repo). */
export function resolveDbFileUrl(): string {
  return `file:${resolveDbFilePath()}`;
}

export const MIGRATIONS_DIR = join(REPO_ROOT, 'packages', 'db', 'migrations');
