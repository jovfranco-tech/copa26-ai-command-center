/**
 * Vercel Edge Middleware — private access screen for the whole deployment.
 *
 * Browser users get a branded access page instead of the default Basic Auth
 * popup. Existing Basic Auth still works for scripts, and Vercel Cron can call
 * the data-sync endpoint with CRON_SECRET.
 */
import { next } from '@vercel/edge';

const COOKIE_NAME = 'wc_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const config = {
  matcher: ['/((?!_vercel).*)'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const user = process.env.SITE_USER || 'admin';
  const pass = process.env.SITE_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;

  if (url.pathname === '/api/login') {
    return login(request, pass);
  }

  if (url.pathname === '/api/logout') {
    return logout(url);
  }

  const authenticated = pass && ((await hasSession(request, pass)) || hasBasicAuth(request, user, pass));
  if (authenticated && url.pathname === '/login') {
    return Response.redirect(new URL('/', request.url), 303);
  }
  if (authenticated) return next();
  if (url.pathname === '/api/data-sync' && hasCronAuth(request, cronSecret)) return next();

  if (url.pathname.startsWith('/api/')) {
    return Response.json(
      { ok: false, reason: pass ? 'auth-required' : 'site-password-missing' },
      { status: pass ? 401 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return accessPage({
    status: pass ? 200 : 503,
    error: pass ? null : 'Falta configurar SITE_PASSWORD en Vercel.',
    redirectTo: url.pathname + url.search,
  });
}

async function login(request: Request, pass: string | undefined): Promise<Response> {
  if (!pass) {
    return accessPage({ status: 503, error: 'Falta configurar SITE_PASSWORD en Vercel.', redirectTo: '/' });
  }

  if (request.method !== 'POST') {
    return accessPage({ status: 200, error: null, redirectTo: '/' });
  }

  let password = '';
  let redirectTo = '/';
  try {
    const form = await request.formData();
    password = String(form.get('password') ?? '');
    redirectTo = safeRedirect(String(form.get('redirectTo') ?? '/'));
  } catch {
    return accessPage({ status: 400, error: 'No pude leer la clave. Intenta de nuevo.', redirectTo: '/' });
  }

  if (password !== pass) {
    return accessPage({ status: 401, error: 'Clave incorrecta.', redirectTo });
  }

  const token = await makeSession(pass);
  const response = new Response(null, {
    status: 303,
    headers: { Location: new URL(redirectTo, request.url).toString() },
  });
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
  );
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function logout(url: URL): Response {
  const response = new Response(null, {
    status: 303,
    headers: { Location: new URL('/login', url).toString() },
  });
  response.headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function hasBasicAuth(request: Request, user: string, pass: string): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;
  try {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(':');
    return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass;
  } catch {
    return false;
  }
}

function hasCronAuth(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function hasSession(request: Request, pass: string): Promise<boolean> {
  const token = readCookie(request.headers.get('cookie') ?? '', COOKIE_NAME);
  if (!token) return false;
  const [issuedRaw, signature] = token.split('.');
  if (!issuedRaw || !signature) return false;
  const issued = Number.parseInt(issuedRaw, 36);
  if (!Number.isFinite(issued) || Date.now() - issued > SESSION_MAX_AGE * 1000) return false;
  const expected = await sign(issuedRaw, pass);
  return timingSafeEqual(signature, expected);
}

async function makeSession(pass: string): Promise<string> {
  const issued = Date.now().toString(36);
  return `${issued}.${await sign(issued, pass)}`;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64Url(sig);
}

function base64Url(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function safeRedirect(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/api/')) return '/';
  return value;
}

function accessPage({
  status,
  error,
  redirectTo,
}: {
  status: number;
  error: string | null;
  redirectTo: string;
}): Response {
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mundial 2026 · Acceso privado</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111827 url('/venue-photos/mex.webp') center / cover no-repeat; color: #121826; }
    body::before { content: ""; position: fixed; inset: 0; background: linear-gradient(115deg, rgba(248,250,252,.96), rgba(248,250,252,.84) 48%, rgba(12,18,30,.44)), radial-gradient(800px 440px at 74% -10%, rgba(201,162,75,.24), transparent 62%); pointer-events: none; }
    main { position: relative; width: min(420px, calc(100vw - 36px)); }
    .card { border: 1px solid rgba(18,28,48,.12); border-radius: 22px; background: rgba(255,255,255,.92); backdrop-filter: blur(18px); box-shadow: 0 26px 70px -34px rgba(22,35,60,.45); overflow: hidden; }
    .stripe { height: 6px; background: linear-gradient(90deg, #c9a24b, #111827, #c9a24b); }
    .body { padding: 28px; }
    .mark { width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; background: linear-gradient(145deg, #d8b45f, #b58c32); color: #111827; box-shadow: 0 14px 30px -18px rgba(0,0,0,.45); }
    h1 { margin: 18px 0 6px; font-size: 24px; line-height: 1.05; letter-spacing: 0; }
    p { margin: 0 0 20px; color: #657086; font-size: 14px; line-height: 1.55; }
    label { display: block; margin: 0 0 8px; color: #7d8799; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    input { width: 100%; height: 46px; box-sizing: border-box; border: 1px solid rgba(18,28,48,.14); border-radius: 12px; padding: 0 14px; font: inherit; color: #121826; background: #fff; outline: none; }
    input:focus { border-color: #c9a24b; box-shadow: 0 0 0 4px rgba(201,162,75,.16); }
    button { width: 100%; height: 46px; margin-top: 14px; border: 0; border-radius: 12px; background: linear-gradient(145deg, #d8b45f, #b58c32); color: #181203; font-weight: 800; cursor: pointer; }
    .error { margin: 0 0 14px; padding: 10px 12px; border-radius: 10px; background: #fff3f2; color: #b42318; border: 1px solid #ffd2cc; font-size: 13px; }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; margin: -6px 0 18px; }
    .meta span { border: 1px solid rgba(18,28,48,.12); border-radius: 999px; padding: 5px 9px; color: #657086; font-size: 11px; font-weight: 700; }
    .foot { margin-top: 14px; text-align: center; color: #4b5565; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="stripe"></div>
      <div class="body">
        <div class="mark" style="background: transparent; box-shadow: none; border-radius: 0; width: auto; height: 72px; display: flex; align-items: center; justify-content: flex-start; margin-bottom: 12px;">
          <img src="/brand/fwc26-emblem.svg" alt="FIFA World Cup 26" style="height: 72px; object-fit: contain; filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12));" />
        </div>
        <h1>Mundial 2026</h1>
        <p>Dashboard privado para calendario, selecciones, jugadores, quiniela familiar y analista.</p>
        <div class="meta"><span>Quiniela familiar</span><span>Datos del torneo</span><span>Modo TV</span></div>
        ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
        <form method="post" action="/api/login">
          <input type="hidden" name="redirectTo" value="${escapeHtml(redirectTo)}" />
          <label for="password">Clave familiar</label>
          <input id="password" name="password" type="password" autocomplete="current-password" autofocus required />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </section>
    <div class="foot">Acceso privado</div>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
