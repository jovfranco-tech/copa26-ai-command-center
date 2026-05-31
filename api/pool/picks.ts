import { eq } from 'drizzle-orm';
import { getPoolPersistenceStatus } from '../../packages/db/src/persistence.js';
import { recordUsage } from '../_shared/usage.js';

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }
  await recordUsage('pool.picks');

  const url = new URL(request.url);
  const playerName = url.searchParams.get('playerName');
  if (!playerName) {
    return Response.json({ ok: false, error: 'missing-playerName' }, { status: 400 });
  }

  const persistence = getPoolPersistenceStatus();
  if (!persistence.ready) {
    return Response.json({ ok: false, error: 'persistent-db-required', persistence }, { status: 503 });
  }

  try {
    const { getDb, schema } = await import('../../packages/db/src/index.js');
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.poolPicks)
      .where(eq(schema.poolPicks.playerName, playerName));

    const picks: Record<string, { homeGoals?: number; awayGoals?: number; outcome?: string }> = {};
    for (const r of rows) {
      picks[r.matchId] = {
        homeGoals: r.homeGoals !== null ? r.homeGoals : undefined,
        awayGoals: r.awayGoals !== null ? r.awayGoals : undefined,
        outcome: r.outcome !== null ? r.outcome : undefined,
      };
    }

    return Response.json({ ok: true, picks });
  } catch (e) {
    console.error('picks fetch failed', e);
    const msg = e instanceof Error ? e.message : 'database-error';
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
