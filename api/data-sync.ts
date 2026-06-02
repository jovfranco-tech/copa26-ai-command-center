/**
 * Vercel Edge Function — lightweight data update health check.
 *
 * The scheduled cron hits this endpoint daily. It does not mutate source files
 * inside the immutable deployment; it gives the app a clear production signal
 * that the data pipeline is reachable and ready for a future ingestion pass.
 */
import { recordUsage } from './_shared/usage.js';

export const config = { runtime: 'edge' };

const CRON_LABEL = 'Diario 12:00 UTC';
const OPENING_DATE = '2026-06-11';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }
  await recordUsage('data.sync');

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent') ?? '';
  const isCron = userAgent.includes('vercel-cron/1.0') || (!!secret && auth === `Bearer ${secret}`);

  if (isCron && secret && auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, reason: 'cron-auth' }, { status: 401 });
  }

  const resultsSourceUrl = process.env.RESULTS_SOURCE_URL;
  const pipeline = await checkResultsPipeline(resultsSourceUrl);
  const checkedAt = new Date().toISOString();

  return Response.json(
    {
      ok: true,
      status: pipeline.status,
      checkedAt,
      mode: isCron ? 'cron' : 'manual',
      cron: CRON_LABEL,
      results: pipeline.results,
      calendar: 'Calendario oficial del torneo',
      resultsSource: resultsSourceUrl ? 'configured' : 'not-configured',
      nextAction: pipeline.nextAction,
      logs: [`${checkedAt} · ${isCron ? 'cron' : 'manual'} · health-check`, `${checkedAt} · results · ${pipeline.results}`],
      errors: pipeline.errors,
      phases: [
        { id: 'calendar', label: 'Calendario', status: 'ok', detail: 'Snapshot local disponible en producción.' },
        {
          id: 'results-feed',
          label: 'Feed de resultados',
          status: pipeline.errors.length ? 'error' : resultsSourceUrl ? 'ok' : 'wait',
          detail: pipeline.results,
        },
        {
          id: 'redeploy',
          label: 'Snapshot redeploy',
          status: resultsSourceUrl ? 'ok' : 'wait',
          detail: resultsSourceUrl ? 'Listo para validar cambios y redeployar.' : 'Pendiente de fuente real autorizada.',
        },
      ],
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

async function checkResultsPipeline(resultsSourceUrl: string | undefined): Promise<{
  status: string;
  results: string;
  nextAction: string;
  errors: string[];
}> {
  const today = new Date().toISOString().slice(0, 10);
  if (today < OPENING_DATE) {
    return {
      status: 'Pipeline listo; torneo pendiente',
      results: `Pendientes hasta el ${OPENING_DATE}`,
      nextAction: 'Mantener cron activo; conectar RESULTS_SOURCE_URL cuando exista feed de marcadores autorizado.',
      errors: [],
    };
  }

  if (!resultsSourceUrl) {
    return {
      status: 'Esperando feed de resultados',
      results: 'Torneo en ventana de juego; falta RESULTS_SOURCE_URL',
      nextAction:
        'Configura RESULTS_SOURCE_URL con JSON de marcadores autorizado; luego el cron podra validar cambios y avisar redeploy.',
      errors: ['RESULTS_SOURCE_URL no configurado'],
    };
  }

  try {
    const res = await fetch(resultsSourceUrl, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { matches?: unknown[]; updatedAt?: string };
    const count = Array.isArray(body.matches) ? body.matches.length : 0;
    return {
      status: count > 0 ? 'Feed de resultados reachable' : 'Feed reachable sin marcadores',
      results: `${count} registros detectados${body.updatedAt ? ` · ${body.updatedAt}` : ''}`,
      nextAction: 'Validar marcadores, correr ingestion local y redeployar snapshot de produccion.',
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch-error';
    return {
      status: 'Feed de resultados con error',
      results: message,
      nextAction: 'Revisar RESULTS_SOURCE_URL o credenciales antes del siguiente cron.',
      errors: [message],
    };
  }
}
