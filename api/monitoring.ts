import { readUsageSnapshot, recordUsage } from './_shared/usage.js';
import { getPoolPersistenceStatus } from '../packages/db/src/persistence.js';

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  await recordUsage('data.sync', 0);
  const usage = await readUsageSnapshot();

  return Response.json(
    {
      ok: true,
      usage,
      pool: getPoolPersistenceStatus(),
      limits: {
        analyst: '30 requests / 10 min por sesion o IP',
        poolAgent: '30 requests / 10 min por sesion o IP',
        poolStorage: 'persistente si DATABASE_URL remoto esta configurado',
      },
      ai: {
        configured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
