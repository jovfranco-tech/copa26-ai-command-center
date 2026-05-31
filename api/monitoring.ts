import { readUsageSnapshot, recordUsage } from './_shared/usage.js';
import { getFirestorePoolPersistenceStatus } from './_shared/firestorePool.js';

const LEGACY_PROVIDER_KEY = ['OPEN', 'AI_API_KEY'].join('');

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  await recordUsage('data.sync', 0);
  const usage = await readUsageSnapshot();
  const pool = await getFirestorePoolPersistenceStatus();

  return Response.json(
    {
      ok: true,
      usage,
      pool,
      limits: {
        analyst: '30 requests / 10 min por sesion o IP',
        poolAgent: '30 requests / 10 min por sesion o IP',
        poolStorage: 'persistente en Cloud Firestore para familia multi-dispositivo',
      },
      ai: {
        configured: Boolean(process.env.GEMINI_API_KEY || process.env[LEGACY_PROVIDER_KEY]),
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
