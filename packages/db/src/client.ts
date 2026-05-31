/** libsql + Drizzle client for the local SQLite file. */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import { LOCAL_DB_DIR, resolveDbFilePath, resolveDbFileUrl } from './paths.js';

export type DB = LibSQLDatabase<typeof schema>;

type Client = ReturnType<typeof createClient>;

let _client: Client | null = null;
let _db: DB | null = null;

export function getClient(): Client {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (url && (url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://'))) {
    _client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  } else {
    mkdirSync(LOCAL_DB_DIR, { recursive: true });
    _client = createClient({ url: resolveDbFileUrl() });
  }
  return _client;
}

export function getDb(): DB {
  if (_db) return _db;
  _db = drizzle(getClient(), { schema });
  return _db;
}

/** Does the SQLite file exist on disk (so the API can decide mock vs sqlite)? */
export function dbFileExists(): boolean {
  return existsSync(resolveDbFilePath());
}

/** Size of the SQLite file in MB (cosmetic, for the SyncCard). */
export function dbFileSizeMB(): number {
  try {
    const bytes = statSync(resolveDbFilePath()).size;
    return Math.round((bytes / (1024 * 1024)) * 10) / 10;
  } catch {
    return 0;
  }
}

export { schema };
