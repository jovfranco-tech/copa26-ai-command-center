import { list, put } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'live-overlay.json', limit: 1 });
    const hit = blobs.find((b) => b.pathname === 'live-overlay.json') ?? blobs[0];
    if (!hit) return Response.json({ ok: true, msg: 'No overlay found' });

    const res = await fetch(hit.url, { cache: 'no-store' });
    const overlay = await res.json();

    if (overlay.results && overlay.results['M001']) {
      delete overlay.results['M001'];
      await put('live-overlay.json', JSON.stringify(overlay), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      return Response.json({ ok: true, msg: 'Cleared M001 from overlay' });
    }
    return Response.json({ ok: true, msg: 'M001 was not in overlay' });
  } catch (e: unknown) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
}
