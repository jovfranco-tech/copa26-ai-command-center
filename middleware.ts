/**
 * Vercel Edge Middleware — public family access.
 *
 * The global password gate is disabled so the dashboard can be shared directly.
 * This middleware only keeps old login/logout URLs graceful and clears legacy
 * session cookies created by the former access screen.
 */
import { next } from '@vercel/edge';

const COOKIE_NAME = 'wc_session';

export const config = {
  matcher: ['/((?!_vercel).*)'],
};

export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);

  if (url.pathname === '/login') {
    return Response.redirect(new URL('/', request.url), 303);
  }

  if (url.pathname === '/api/login') {
    return Response.json(
      { ok: true, publicAccess: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (url.pathname === '/api/logout') {
    return clearLegacySession(url);
  }

  return next();
}

function clearLegacySession(url: URL): Response {
  const response = new Response(null, {
    status: 303,
    headers: { Location: new URL('/', url).toString() },
  });
  response.headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
