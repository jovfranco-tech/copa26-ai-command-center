#!/usr/bin/env node

const baseUrl = (process.env.APP_BASE_URL || 'https://fifa-private-world-cup-dashboard.vercel.app').replace(/\/$/, '');
const user = process.env.SITE_USER || 'admin';
const pass = process.env.SITE_PASSWORD || '';
const authHeader = pass ? `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` : null;

const routes = ['/', '/data', '/pool', '/analyst'];
const requiredText = {
  '/': ['Centro privado Mundial 2026', 'Panel'],
  '/data': ['Centro privado Mundial 2026', 'Centro de datos'],
  '/pool': ['Centro privado Mundial 2026', 'Quiniela familiar'],
  '/analyst': ['Centro privado Mundial 2026', 'Analista de partidos'],
};

let failures = 0;

for (const route of routes) {
  const url = `${baseUrl}${route}`;
  const res = await fetch(url, {
    headers: authHeader ? { authorization: authHeader } : {},
    redirect: 'follow',
  });
  const text = await res.text();
  const allowed = requiredText[route] ?? [];
  const hasExpectedText = allowed.some((needle) => text.includes(needle));
  const ok = res.status < 500 && hasExpectedText;
  console.log(`${ok ? 'ok' : 'fail'} ${route} ${res.status} ${res.url}`);
  if (!ok) {
    failures += 1;
    console.log(`  expected one of: ${allowed.join(' | ')}`);
  }
}

if (failures) {
  console.error(`E2E smoke failed: ${failures} route(s) did not match.`);
  process.exit(1);
}

console.log(`E2E smoke passed against ${baseUrl}`);
