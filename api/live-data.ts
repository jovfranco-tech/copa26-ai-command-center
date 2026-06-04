/**
 * GET /api/live-data — public read of the live overlay (results + lineups).
 * Returns an empty overlay when nothing has been published yet (or Blob is not
 * configured), so the app always renders. Cached briefly so admin edits show up
 * within seconds without hammering storage.
 *
 * Node (Fluid) runtime: @vercel/blob depends on undici, which is not supported on
 * the edge runtime — keeping this off edge stops it leaking into the edge bundle.
 */
import { getOverlay } from './_shared/overlay.js';

// No `config` block → Node (Fluid) runtime by default for method-export handlers.

export async function GET(): Promise<Response> {
  const overlay = await getOverlay();
  return Response.json(overlay, {
    headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30' },
  });
}
