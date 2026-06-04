/**
 * Server-side I/O for the live overlay (Vercel Blob).
 *
 * Writes only ever happen from the password-gated /api/admin-update endpoint, and
 * the Blob token lives only on the server — so the public can read the overlay
 * but cannot write it. Degrades gracefully: with no BLOB_READ_WRITE_TOKEN the
 * getters return an empty overlay and the app behaves exactly as before.
 */
import { list, put } from '@vercel/blob';
import { sanitizeOverlay, emptyOverlay, type LiveOverlay } from '../../packages/shared/src/liveOverlay.js';

const KEY = 'live-overlay.json';

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function getOverlay(): Promise<LiveOverlay> {
  if (!blobConfigured()) return emptyOverlay();
  try {
    const { blobs } = await list({ prefix: KEY, limit: 1 });
    const hit = blobs.find((b) => b.pathname === KEY) ?? blobs[0];
    if (!hit) return emptyOverlay();
    const res = await fetch(hit.url, { cache: 'no-store' });
    if (!res.ok) return emptyOverlay();
    return sanitizeOverlay(await res.json());
  } catch {
    return emptyOverlay();
  }
}

export async function putOverlay(overlay: LiveOverlay): Promise<void> {
  await put(KEY, JSON.stringify(sanitizeOverlay(overlay)), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}
