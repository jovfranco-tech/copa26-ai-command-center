import { readUsageSnapshot, recordUsage } from './_shared/usage.js';
import { getFirestorePoolPersistenceStatus } from './_shared/firestorePool.js';

export const config = { runtime: 'edge' };

type AdminActionStatus = 'ready' | 'pending' | 'blocked';

interface AdminAction {
  id: string;
  label: string;
  status: AdminActionStatus;
  detail: string;
  command?: string;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }

  await recordUsage('data.sync', 0);
  const usage = await readUsageSnapshot();
  const pool = await getFirestorePoolPersistenceStatus();
  const resultsSource = process.env.RESULTS_SOURCE_URL;
  const resultsAuth = process.env.RESULTS_AUTH_TOKEN;
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env[['OPEN', 'AI_API_KEY'].join('')]);
  const checkedAt = new Date().toISOString();

  const actions: AdminAction[] = [
    {
      id: 'validate-feed',
      label: 'Validar feed real',
      status: resultsSource ? 'ready' : 'pending',
      detail: resultsSource
        ? `RESULTS_SOURCE_URL configurado${resultsAuth ? ' con token Bearer.' : ' sin token.'}`
        : 'Configura RESULTS_SOURCE_URL cuando tengas proveedor autorizado de marcadores.',
      command: 'vercel env add RESULTS_SOURCE_URL production',
    },
    {
      id: 'run-smoke',
      label: 'Smoke test producción',
      status: 'ready',
      detail: 'Comprueba home, datos, quiniela y analista contra el dominio público.',
      command: 'pnpm test:e2e',
    },
    {
      id: 'refresh-assets',
      label: 'Regenerar assets locales',
      status: 'ready',
      detail: 'Actualiza intel packs, galerías de sedes y kits generados/fallback.',
      command: 'pnpm assets:finalize && pnpm validate:data',
    },
    {
      id: 'pool-persistence',
      label: 'Quiniela persistente',
      status: pool.durable ? 'ready' : 'blocked',
      detail: pool.detail,
    },
    {
      id: 'ai-budget',
      label: 'Presupuesto IA',
      status: aiConfigured ? 'ready' : 'pending',
      detail: aiConfigured
        ? `Proveedor activo; uso hoy: ${usage.items['ai.analyst'] ?? 0} analista, ${usage.items['ai.pool-agent'] ?? 0} co-piloto.`
        : 'Proveedor remoto no detectado; fallback local protege consumo.',
    },
  ];

  const dataGaps = [
    {
      id: 'referees',
      label: 'Árbitros oficiales',
      status: 'pending',
      detail: 'Cargar cuando FIFA publique designaciones por partido; no se inventan nombres.',
    },
    {
      id: 'h2h',
      label: 'Historial H2H',
      status: 'pending',
      detail: 'Pipeline listo para una fuente histórica autorizada o curado manual.',
    },
    {
      id: 'final-squads',
      label: 'Convocatorias finales',
      status: 'pending',
      detail: 'Plantillas actuales son editables; reemplazar por listas finales oficiales cuando existan.',
    },
    {
      id: 'ratings-review',
      label: 'Ratings estimados',
      status: 'pending',
      detail: 'Mantener fuente/fecha/confianza visible y revisar estimados tras convocatoria final.',
    },
  ];

  return Response.json(
    {
      ok: true,
      checkedAt,
      summary: {
        ready: actions.filter((action) => action.status === 'ready').length,
        pending: actions.filter((action) => action.status === 'pending').length,
        blocked: actions.filter((action) => action.status === 'blocked').length,
      },
      actions,
      dataGaps,
      usage,
      pool,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
