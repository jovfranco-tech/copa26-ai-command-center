import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../../packages/db/src/index.js';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  let body: {
    playerName?: string;
    picks?: Record<string, { homeGoals?: number; awayGoals?: number; outcome?: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }

  const { playerName, picks } = body;
  if (!playerName || !picks) {
    return Response.json({ ok: false, error: 'missing-fields' }, { status: 400 });
  }

  try {
    const db = getDb();

    for (const [matchId, p] of Object.entries(picks)) {
      const existing = await db
        .select()
        .from(schema.poolPicks)
        .where(
          and(
            eq(schema.poolPicks.playerName, playerName),
            eq(schema.poolPicks.matchId, matchId)
          )
        );

      const values = {
        playerName,
        matchId,
        homeGoals: p.homeGoals !== undefined ? p.homeGoals : null,
        awayGoals: p.awayGoals !== undefined ? p.awayGoals : null,
        outcome: p.outcome ?? null,
        updatedAt: new Date().toISOString(),
      };

      if (existing.length) {
        await db
          .update(schema.poolPicks)
          .set(values)
          .where(eq(schema.poolPicks.id, existing[0]!.id));
      } else {
        await db.insert(schema.poolPicks).values(values);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('sync failed', e);
    const msg = e instanceof Error ? e.message : 'database-error';
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
