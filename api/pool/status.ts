import { getPoolPersistenceStatus } from '../../packages/db/src/persistence.js';

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  return Response.json(
    {
      ok: true,
      persistence: getPoolPersistenceStatus(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
