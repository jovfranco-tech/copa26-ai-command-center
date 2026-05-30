/**
 * Vercel Edge Function — lightweight data update health check.
 *
 * The scheduled cron hits this endpoint daily. It does not mutate source files
 * inside the immutable deployment; it gives the app a clear production signal
 * that the data pipeline is reachable and ready for a future ingestion pass.
 */
export const config = { runtime: 'edge' };

const CRON_LABEL = 'Diario 12:00 UTC';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent') ?? '';
  const isCron = userAgent.includes('vercel-cron/1.0') || (!!secret && auth === `Bearer ${secret}`);

  if (isCron && secret && auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, reason: 'cron-auth' }, { status: 401 });
  }

  return Response.json(
    {
      ok: true,
      status: 'Datos listos para revisión',
      checkedAt: new Date().toISOString(),
      mode: isCron ? 'cron' : 'manual',
      cron: CRON_LABEL,
      results: 'Pendientes hasta el 11 de junio de 2026',
      calendar: 'Snapshot local openfootball CC0',
      nextAction:
        'Cuando haya marcadores reales, ejecutar ingestion local, validar datos y redeployar producción.',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
