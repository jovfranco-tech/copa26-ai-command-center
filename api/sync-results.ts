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
import { scrapeCardsForMatch } from './_shared/gemini-news-scraper.js';
import { MATCHES } from '../packages/shared/src/dataset/index.js';

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

  let playerStatsWritten = false;
  if (mapping.playerStats && JSON.stringify(overlay.playerStats) !== JSON.stringify(mapping.playerStats)) {
    playerStatsWritten = true;
  }

  for (const [id, r] of Object.entries(mapping.results)) {
    const existing = overlay.results[id];
    if (existing?.source === 'manual') {
      skippedManual++;
      continue; // never overwrite a manual entry
    }
    
    // Check if match just finished
    const justFinished = r.status === 'FT' && existing?.status !== 'FT';

    if (existing && sameResult(existing, r) && !justFinished) continue; // no change
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

    // Gemini Search Grounding for cards when match just finished
    if (justFinished && process.env.GEMINI_API_KEY) {
      const matchDef = MATCHES.find(m => m.id === id);
      if (matchDef) {
        const cards = await scrapeCardsForMatch(matchDef.home, matchDef.away, process.env.GEMINI_API_KEY);
        if (cards) {
          overlay.playerStats = overlay.playerStats || {};
          for (const pid of cards.yellowCards) {
            overlay.playerStats[pid] = overlay.playerStats[pid] || { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
            overlay.playerStats[pid].yellow = (overlay.playerStats[pid].yellow || 0) + 1;
          }
          for (const pid of cards.redCards) {
            overlay.playerStats[pid] = overlay.playerStats[pid] || { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
            overlay.playerStats[pid].red = (overlay.playerStats[pid].red || 0) + 1;
          }
          playerStatsWritten = true;
        }
      }
    }
  }

  const nextLineups = { ...overlay.lineups };
  let lineupsWritten = false;
  if (mapping.lineups) {
    for (const [id, l] of Object.entries(mapping.lineups)) {
      const existing = overlay.lineups[id];
      if (existing?.source === 'manual') continue; // never overwrite manual lineup
      if (JSON.stringify(existing) !== JSON.stringify(l)) {
        nextLineups[id] = l;
        lineupsWritten = true;
      }
    }
  }

  if (written > 0 || playerStatsWritten || lineupsWritten) {
    await putOverlay({ 
      ...overlay, 
      results: nextResults, 
      playerStats: mapping.playerStats ?? overlay.playerStats,
      lineups: nextLineups,
      updatedAt: new Date().toISOString() 
    });
  }

  return Response.json(
    {
      ok: true,
      total: mapping.total,
      matched: mapping.matched,
      written: written + (playerStatsWritten ? 1 : 0),
      skippedManual,
      unmatched: mapping.unmatched.length,
      unmatchedSample: mapping.unmatched.slice(0, 3),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
