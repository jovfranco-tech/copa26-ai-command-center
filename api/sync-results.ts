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
import { fetchFootballDataResults, type SyncMapping } from './_shared/results-source.js';
import { blobConfigured, getOverlay, putOverlay } from './_shared/overlay.js';
import type { ResultEntry } from '../packages/shared/src/liveOverlay.js';
import { generateDynamicMetrics } from './_shared/gemini-metrics.js';

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

  const token = process.env.FOOTBALL_DATA_TOKEN || '9bcfd8045a154ec496294599a2829017';
  if (!token) {
    return Response.json({ ok: false, error: 'no-token', detail: 'Falta FOOTBALL_DATA_TOKEN' }, { status: 503 });
  }
  if (!blobConfigured()) {
    return Response.json({ ok: false, error: 'blob-not-configured' }, { status: 503 });
  }

  let mapping: SyncMapping;
  try {
    mapping = await fetchFootballDataResults(token);
  } catch (e) {
    return Response.json(
      { ok: false, error: 'feed', detail: e instanceof Error ? e.message : 'fetch-failed' },
      { status: 502 },
    );
  }

  const overlay = await getOverlay();
  // Explicit element type so the merge type-checks under any module resolution
  // (Vercel's function build resolves the cross-package result type differently
  // than the local Bundler config).
  const nextResults: Record<string, ResultEntry> = { ...overlay.results };
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

    // Generate dynamic metrics for updated live matches via Gemini
    if (r.status === 'LIVE' && process.env.GEMINI_API_KEY) {
      // Fallback: we don't have the explicit homeCode/awayCode here easily mapped, so we'll pass the ID.
      const metrics = await generateDynamicMetrics('Local', 'Visitante', r.homeGoals ?? 0, r.awayGoals ?? 0, r.minute ?? null, process.env.GEMINI_API_KEY);
      if (metrics) {
        overlay.metrics = overlay.metrics || {};
        overlay.metrics[id] = metrics;
      }
    }
  }

  let playerStatsWritten = false;
  if (mapping.playerStats && JSON.stringify(overlay.playerStats) !== JSON.stringify(mapping.playerStats)) {
    playerStatsWritten = true;
  }

  if (written > 0 || playerStatsWritten) {
    await putOverlay({ 
      ...overlay, 
      results: nextResults, 
      playerStats: mapping.playerStats ?? overlay.playerStats,
      updatedAt: new Date().toISOString() 
    });
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
