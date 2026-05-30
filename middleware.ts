/**
 * Vercel Edge Middleware — HTTP Basic Auth gate for the WHOLE deployment
 * (HTML, JS, CSS, assets — everything). This is the free, server-side
 * equivalent of Vercel's paid Password Protection.
 *
 * Configure in Vercel project env vars (Production):
 *   vercel env add SITE_PASSWORD production      (required)
 *   vercel env add SITE_USER production          (optional, default "admin")
 *
 * Until SITE_PASSWORD is set on the deployment, the site stays CLOSED (401) —
 * private by default. After setting it, redeploy so the new value is picked up.
 */
import { next } from '@vercel/edge';

export const config = {
  // Gate everything except Vercel's internal endpoints.
  matcher: ['/((?!_vercel).*)'],
};

export default function middleware(request: Request): Response | undefined {
  const user = process.env.SITE_USER || 'admin';
  const pass = process.env.SITE_PASSWORD;

  const header = request.headers.get('authorization');
  if (pass && header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(':');
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === pass) return next();
    } catch {
      // malformed header -> fall through to 401
    }
  }

  return new Response('Acceso restringido · Mundial 2026 (privado).', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Mundial 2026 (privado)", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
