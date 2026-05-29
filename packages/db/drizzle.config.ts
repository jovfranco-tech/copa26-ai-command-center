import { defineConfig } from 'drizzle-kit';

// Local-only. `drizzle-kit generate` only needs the schema; applying migrations is
// done by `tsx src/migrate.ts` (libsql migrator), which resolves the real DB path.
// The URL below is relative to this package dir and only used by studio/push.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:../../local-db/worldcup.sqlite',
  },
  strict: true,
  verbose: true,
});
