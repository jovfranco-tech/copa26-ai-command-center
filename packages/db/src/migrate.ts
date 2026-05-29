/** Apply generated migrations to the local SQLite file. Run: pnpm db:migrate */
import { existsSync, readdirSync } from 'node:fs';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getClient, getDb } from './client.js';
import { MIGRATIONS_DIR, resolveDbFilePath } from './paths.js';

async function main() {
  if (!existsSync(MIGRATIONS_DIR) || readdirSync(MIGRATIONS_DIR).length === 0) {
    console.error(
      '[db:migrate] No migrations found. Run `pnpm db:generate` first to create them from the schema.',
    );
    process.exit(1);
  }
  console.log(`[db:migrate] Applying migrations to ${resolveDbFilePath()}`);
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_DIR });
  getClient().close();
  console.log('[db:migrate] Done.');
}

main().catch((err) => {
  console.error('[db:migrate] Failed:', err);
  process.exit(1);
});
