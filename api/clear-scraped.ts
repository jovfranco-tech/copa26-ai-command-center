import { blobConfigured, getOverlay, putOverlay } from './_shared/overlay.js';

export async function GET(_request: Request) {
  if (!blobConfigured()) {
    return Response.json({ ok: false, error: 'blob-not-configured' }, { status: 503 });
  }

  const overlay = await getOverlay();
  const old = overlay.scrapedMatches || [];
  overlay.scrapedMatches = [];
  
  await putOverlay(overlay);
  
  return Response.json({
    ok: true,
    cleared: old
  });
}
