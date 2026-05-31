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
import { getDb, getPoolPersistenceStatus, schema } from '@worldcup/db';
import { and, eq } from 'drizzle-orm';

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

app.get('/api/pool/status', (c) => c.json({ ok: true, persistence: getPoolPersistenceStatus() }));

app.get('/api/monitoring', (c) =>
  c.json({
    ok: true,
    usage: { provider: 'memory', day: new Date().toISOString().slice(0, 10), items: {} },
    pool: getPoolPersistenceStatus(),
    limits: {
      analyst: '30 requests / 10 min por sesion o IP',
      poolAgent: '30 requests / 10 min por sesion o IP',
      poolStorage: 'persistente si DATABASE_URL remoto esta configurado',
    },
    ai: { configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
  }),
);

app.post('/api/pool/sync', async (c) => {
  let body: {
    playerName?: string;
    picks?: Record<string, { homeGoals?: number; awayGoals?: number; outcome?: string }>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'bad-request' }, 400);
  }

  const { playerName, picks } = body;
  if (!playerName || !picks) {
    return c.json({ ok: false, error: 'missing-fields' }, 400);
  }

  const db = getDb();

  for (const [matchId, p] of Object.entries(picks)) {
    const existing = await db
      .select()
      .from(schema.poolPicks)
      .where(and(eq(schema.poolPicks.playerName, playerName), eq(schema.poolPicks.matchId, matchId)));

    const values = {
      playerName,
      matchId,
      homeGoals: p.homeGoals !== undefined ? p.homeGoals : null,
      awayGoals: p.awayGoals !== undefined ? p.awayGoals : null,
      outcome: p.outcome ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (existing.length) {
      await db
        .update(schema.poolPicks)
        .set(values)
        .where(eq(schema.poolPicks.id, existing[0]!.id));
    } else {
      await db.insert(schema.poolPicks).values(values);
    }
  }

  return c.json({ ok: true });
});

app.get('/api/pool/picks', async (c) => {
  const { playerName } = c.req.query();
  if (!playerName) {
    return c.json({ ok: false, error: 'missing-playerName' }, 400);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.poolPicks)
    .where(eq(schema.poolPicks.playerName, playerName));

  const picks: Record<string, { homeGoals?: number; awayGoals?: number; outcome?: string }> = {};
  for (const r of rows) {
    picks[r.matchId] = {
      homeGoals: r.homeGoals !== null ? r.homeGoals : undefined,
      awayGoals: r.awayGoals !== null ? r.awayGoals : undefined,
      outcome: r.outcome !== null ? r.outcome : undefined,
    };
  }

  return c.json({ ok: true, picks });
});

app.get('/api/pool/leaderboard', async (c) => {
  const db = getDb();

  const matchRows = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, 'FT'));

  const pickRows = await db.select().from(schema.poolPicks);
  const teamRows = await db.select().from(schema.teams);
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  const playerPicks = new Map<string, typeof pickRows>();
  for (const r of pickRows) {
    const list = playerPicks.get(r.playerName) ?? [];
    list.push(r);
    playerPicks.set(r.playerName, list);
  }

  const board: Array<{
    playerName: string;
    points: number;
    exactScores: number;
    outcomeHits: number;
    efficiency: number;
    predictedCount: number;
  }> = [];

  for (const [name, picks] of playerPicks.entries()) {
    let points = 0;
    let exactScores = 0;
    let outcomeHits = 0;
    let predictedPlayedCount = 0;

    for (const m of matchRows) {
      const pick = picks.find((p) => p.matchId === m.fifaId || p.matchId === String(m.id));
      if (!pick || !pick.outcome) continue;

      predictedPlayedCount++;
      const realHome = m.homeScore ?? 0;
      const realAway = m.awayScore ?? 0;

      let realOutcome: 'home' | 'draw' | 'away' = 'draw';
      if (realHome > realAway) realOutcome = 'home';
      else if (realHome < realAway) realOutcome = 'away';

      const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
      const isOutcomeCorrect = pick.outcome === realOutcome;

      if (isExact) {
        points += 3;
        exactScores++;
      } else if (isOutcomeCorrect) {
        points += 1;
        outcomeHits++;
      }
    }

    const efficiency = predictedPlayedCount > 0 ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100) : 0;

    board.push({
      playerName: name,
      points,
      exactScores,
      outcomeHits,
      efficiency,
      predictedCount: picks.length,
    });
  }

  // Inject the 3 virtual AI agents to compete in the leaderboard
  const agents: Array<'optimista' | 'stats' | 'contrarian'> = ['optimista', 'stats', 'contrarian'];
  const agentNames = {
    optimista: '🤖 El Analista Optimista',
    stats: '🤖 El Simulador Estadístico',
    contrarian: '🤖 El Agente Contrarian',
  };

  for (const agent of agents) {
    let points = 0;
    let exactScores = 0;
    let outcomeHits = 0;
    let predictedPlayedCount = 0;

    for (const m of matchRows) {
      const homeTeam = teamMap.get(m.homeTeamId ?? -1);
      const awayTeam = teamMap.get(m.awayTeamId ?? -1);

      const homeRank = homeTeam?.ranking ?? 50;
      const awayRank = awayTeam?.ranking ?? 50;
      const rankDiff = awayRank - homeRank;

      let pred: { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' };
      if (agent === 'optimista') {
        if (rankDiff > 10) pred = { homeGoals: 3, awayGoals: 1, outcome: 'home' };
        else if (rankDiff < -10) pred = { homeGoals: 1, awayGoals: 3, outcome: 'away' };
        else pred = { homeGoals: 2, awayGoals: 2, outcome: 'draw' };
      } else if (agent === 'stats') {
        if (rankDiff > 5) pred = { homeGoals: 1, awayGoals: 0, outcome: 'home' };
        else if (rankDiff < -5) pred = { homeGoals: 0, awayGoals: 1, outcome: 'away' };
        else pred = { homeGoals: 1, awayGoals: 1, outcome: 'draw' };
      } else {
        if (rankDiff > 15) pred = { homeGoals: 1, awayGoals: 2, outcome: 'away' };
        else if (rankDiff < -15) pred = { homeGoals: 2, awayGoals: 1, outcome: 'home' };
        else pred = { homeGoals: 0, awayGoals: 0, outcome: 'draw' };
      }

      predictedPlayedCount++;
      const realHome = m.homeScore ?? 0;
      const realAway = m.awayScore ?? 0;

      let realOutcome: 'home' | 'draw' | 'away' = 'draw';
      if (realHome > realAway) realOutcome = 'home';
      else if (realHome < realAway) realOutcome = 'away';

      const isExact = pred.homeGoals === realHome && pred.awayGoals === realAway;
      const isOutcomeCorrect = pred.outcome === realOutcome;

      if (isExact) {
        points += 3;
        exactScores++;
      } else if (isOutcomeCorrect) {
        points += 1;
        outcomeHits++;
      }
    }

    const efficiency = predictedPlayedCount > 0 ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100) : 0;

    board.push({
      playerName: agentNames[agent],
      points,
      exactScores,
      outcomeHits,
      efficiency,
      predictedCount: matchRows.length,
    });
  }

  board.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.efficiency - a.efficiency;
  });

  return c.json({ ok: true, leaderboard: board });
});

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
