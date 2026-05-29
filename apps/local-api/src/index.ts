/**
 * Local-only API (Hono). Reads the local SQLite store via the data source and
 * serves locally-downloaded assets. Binds to the loopback interface only.
 */
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  getAssetRecord,
  getStandings,
  getStats,
  getSyncStatus,
  loadBundle,
} from './data-source.js';
import { assertLocalOnly, env } from './env.js';

const app = new Hono();

// Allow only localhost origins (the Vite dev server). Never wildcard.
app.use(
  '/api/*',
  cors({
    origin: (origin) =>
      !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
        ? (origin ?? '*')
        : '',
  }),
);

app.get('/api/health', (c) => c.json({ ok: true, service: 'worldcup-local-api' }));

app.get('/api/teams', async (c) => {
  const b = await loadBundle();
  return c.json({ source: b.source, count: b.teams.length, items: b.teams });
});

app.get('/api/teams/:id', async (c) => {
  const b = await loadBundle();
  const id = c.req.param('id');
  const item = b.teams.find((t) => t.code === id || t.id === id) ?? null;
  return c.json({ source: b.source, item });
});

app.get('/api/players', async (c) => {
  const b = await loadBundle();
  const { team, pos, q } = c.req.query();
  let items = b.players;
  if (team) items = items.filter((p) => p.team === team);
  if (pos) items = items.filter((p) => p.pos === pos);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.club.toLowerCase().includes(needle),
    );
  }
  return c.json({ source: b.source, count: items.length, items });
});

app.get('/api/players/:id', async (c) => {
  const b = await loadBundle();
  const id = c.req.param('id');
  const item = b.players.find((p) => p.id === id) ?? null;
  return c.json({ source: b.source, item });
});

app.get('/api/matches', async (c) => {
  const b = await loadBundle();
  const { status, group, team, stage, venue, date } = c.req.query();
  let items = b.matches;
  if (status) items = items.filter((m) => m.status === status);
  if (group) items = items.filter((m) => m.group === group);
  if (team) items = items.filter((m) => m.home === team || m.away === team);
  if (stage) items = items.filter((m) => m.stage === stage);
  if (venue) items = items.filter((m) => m.venue === venue);
  if (date) items = items.filter((m) => m.date === date);
  return c.json({ source: b.source, count: items.length, items });
});

app.get('/api/matches/:id', async (c) => {
  const b = await loadBundle();
  const id = c.req.param('id');
  const item = b.matches.find((m) => m.id === id) ?? null;
  const events = item ? b.events.filter((e) => e.matchId === id) : [];
  const venue = item ? (b.venues.find((v) => v.id === item.venue) ?? null) : null;
  return c.json({ source: b.source, item, events, venue });
});

app.get('/api/venues', async (c) => {
  const b = await loadBundle();
  return c.json({ source: b.source, count: b.venues.length, items: b.venues });
});

app.get('/api/standings', async (c) => c.json(await getStandings()));

app.get('/api/stats', async (c) => c.json(await getStats()));

app.get('/api/sync/status', async (c) => c.json(await getSyncStatus()));

/** Serve a locally-downloaded asset by its registry id. Local files only. */
app.get('/api/assets/:assetId', async (c) => {
  const rec = await getAssetRecord(c.req.param('assetId'));
  if (!rec) return c.json({ error: 'asset not found' }, 404);

  // Resolve + contain the path strictly inside private-assets to avoid traversal.
  const base = join(env.repoRoot, 'private-assets');
  const abs = isAbsolute(rec.localPath)
    ? normalize(rec.localPath)
    : normalize(join(env.repoRoot, rec.localPath));
  if (!abs.startsWith(base)) return c.json({ error: 'forbidden' }, 403);

  try {
    const buf = await readFile(abs);
    return c.body(buf as unknown as ArrayBuffer, 200, {
      'Content-Type': rec.mimeType ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
  } catch {
    return c.json({ error: 'asset file missing on disk' }, 404);
  }
});

// Root info (not under /api) — handy when opening the API in a browser.
app.get('/', (c) =>
  c.text(
    'FIFA Private World Cup Dashboard — local API. Endpoints live under /api. Local-only; not for public distribution.',
  ),
);

assertLocalOnly(env.host);

const bundlePromise = loadBundle();
bundlePromise.then((b) => {
  console.log(`[local-api] data source: ${b.source}${b.source === 'mock' ? ' (run pnpm db:migrate && pnpm db:seed, or the ingestion scripts, to load SQLite)' : ''}`);
});

serve({ fetch: app.fetch, hostname: env.host, port: env.port }, (info) => {
  console.log(`[local-api] listening on http://${env.host}:${info.port}  (loopback only)`);
});
