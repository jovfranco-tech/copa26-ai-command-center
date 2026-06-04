/**
 * GET /api/sync-results — scheduled auto-ingestion of live World Cup scores.
 *
 * A Vercel cron hits this on a schedule; it pulls scores from football-data.org,
 * maps them onto our fixtures, and merges them into the live overlay (Blob). The
 * app then shows updated scores/standings with no redeploy and no manual entry.
 *
 * Auth: Vercel cron (user-agent vercel-cron/1.0 or Bearer CRON_SECRET) OR a manual
 * trigger with the admin password (x-admin-password) for testing.
 *
 * Respects manual overrides: a result the admin set in the panel (source 'manual')
 * is never overwritten by the feed. Only writes the overlay when something changed.
 *
 * Node (Fluid) runtime: needs @vercel/blob (undici), not edge-compatible.
 */
import { fetchFootballDataResults } from './_shared/results-source.js';
import { blobConfigured, getOverlay, putOverlay } from './_shared/overlay.js';

function authorized(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  const auth = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  const isCron = ua.includes('vercel-cron/1.0') || (!!secret && auth === `Bearer ${secret}`);
  const adminPw = process.env.ADMIN_PASSWORD;
  const isAdmin = !!adminPw && request.headers.get('x-admin-password') === adminPw;
  return isCron || isAdmin;
}

const sameResult = (a: unknown, b: unknown): boolean => {
  const x = (a ?? {}) as Record<string, unknown>;
  const y = (b ?? {}) as Record<string, unknown>;
  return x.homeGoals === y.homeGoals && x.awayGoals === y.awayGoals && x.status === y.status && x.minute === y.minute;
};

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: 'auth' }, { status: 401 });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: 'no-token', detail: 'Falta FOOTBALL_DATA_TOKEN' }, { status: 503 });
  }
  if (!blobConfigured()) {
    return Response.json({ ok: false, error: 'blob-not-configured' }, { status: 503 });
  }

  let mapping;
  try {
    mapping = await fetchFootballDataResults(token);
  } catch (e) {
    return Response.json(
      { ok: false, error: 'feed', detail: e instanceof Error ? e.message : 'fetch-failed' },
      { status: 502 },
    );
  }

  const overlay = await getOverlay();
  const nextResults = { ...overlay.results };
  let written = 0;
  let skippedManual = 0;

  for (const [id, r] of Object.entries(mapping.results)) {
    const existing = overlay.results[id];
    if (existing?.source === 'manual') {
      skippedManual++;
      continue; // never overwrite a manual entry
    }
    if (existing && sameResult(existing, r)) continue; // no change
    nextResults[id] = r;
    written++;
  }

  if (written > 0) {
    await putOverlay({ ...overlay, results: nextResults, updatedAt: new Date().toISOString() });
  }

  return Response.json(
    {
      ok: true,
      total: mapping.total,
      matched: mapping.matched,
      written,
      skippedManual,
      unmatched: mapping.unmatched.length,
      unmatchedSample: mapping.unmatched.slice(0, 8),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
