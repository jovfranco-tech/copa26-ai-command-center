/**
 * GET /api/live-data — public read of the live overlay (results + lineups).
 * Returns an empty overlay when nothing has been published yet (or Blob is not
 * configured), so the app always renders. Cached briefly so admin edits show up
 * within seconds without hammering storage.
 */
import { getOverlay } from './_shared/overlay.js';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method' }, { status: 405 });
  }
  const overlay = await getOverlay();
  return Response.json(overlay, {
    headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30' },
  });
}
