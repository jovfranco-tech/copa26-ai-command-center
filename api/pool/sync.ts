import { recordUsage } from '../_shared/usage.js';
import { normalizePlayerName, writePoolPicksToFirestore, type FirestorePoolPick } from '../_shared/firestorePool.js';

export async function POST(request: Request): Promise<Response> {
  await recordUsage('pool.sync');

  let body: {
    playerName?: string;
    picks?: Record<string, FirestorePoolPick>;
  };
  try {
    body = (await request.json()) as {
      playerName?: string;
      picks?: Record<string, FirestorePoolPick>;
    };
  } catch {
    return Response.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }

  let playerName = '';
  try {
    playerName = body.playerName ? normalizePlayerName(body.playerName) : '';
  } catch {
    return Response.json({ ok: false, error: 'invalid-player-name' }, { status: 400 });
  }
  const picks = body.picks;
  if (!playerName || !picks || typeof picks !== 'object') {
    return Response.json({ ok: false, error: 'missing-fields' }, { status: 400 });
  }

  if (Object.keys(picks).length > 104) {
    return Response.json({ ok: false, error: 'too-many-picks' }, { status: 400 });
  }

  try {
    await writePoolPicksToFirestore(playerName, picks);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'firestore-sync-failed' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ ok: false, error: 'method' }, { status: 405 });
}
