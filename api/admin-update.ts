/**
 * Admin write endpoint for the live overlay. Password-gated via the ADMIN_PASSWORD
 * env var (checked server-side; never shipped to the client). The Blob token lives
 * only here, so this is the ONLY path that can mutate the overlay.
 *
 *   GET  → { ok, configured, overlay }   (requires correct password; used by the panel)
 *   POST → apply one AdminOp, persist, return the new overlay
 *
 * Body (POST): { op, matchId, data } — see applyAdminOp in @worldcup/shared.
 *
 * Node (Fluid) runtime: @vercel/blob depends on undici (not edge-compatible).
 */
import { applyAdminOp, type AdminOp } from '../packages/shared/src/liveOverlay.js';
import { blobConfigured, getOverlay, putOverlay } from './_shared/overlay.js';

// No `config` block → Node (Fluid) runtime by default for method-export handlers.

/** Length-then-value comparison; avoids leaking length via early exit on equal-length inputs. */
function passwordOk(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-password') ?? '';
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function GET(request: Request): Promise<Response> {
  const configured = blobConfigured() && Boolean(process.env.ADMIN_PASSWORD);
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, configured: false, error: 'not-configured' }, { status: 503 });
  }
  if (!passwordOk(request)) return Response.json({ ok: false, configured }, { status: 401 });
  return Response.json(
    { ok: true, configured, overlay: await getOverlay() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!passwordOk(request)) return Response.json({ ok: false, error: 'auth' }, { status: 401 });
  if (!blobConfigured()) return Response.json({ ok: false, error: 'blob-not-configured' }, { status: 503 });

  let body: AdminOp;
  try {
    body = (await request.json()) as AdminOp;
  } catch {
    return Response.json({ ok: false, error: 'json' }, { status: 400 });
  }

  const current = await getOverlay();
  const next = applyAdminOp(current, body);
  if (!next) return Response.json({ ok: false, error: 'bad-op' }, { status: 400 });
  next.updatedAt = new Date().toISOString();

  try {
    await putOverlay(next);
  } catch {
    return Response.json({ ok: false, error: 'write-failed' }, { status: 502 });
  }
  return Response.json({ ok: true, overlay: next }, { headers: { 'Cache-Control': 'no-store' } });
}
