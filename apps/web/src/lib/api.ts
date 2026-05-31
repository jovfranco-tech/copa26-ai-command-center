/**
 * Local API client. Talks to the loopback API through Vite's same-origin /api
 * proxy. If the API process is not running, it transparently falls back to the
 * bundled typed mock data so the UI always renders something useful.
 */
import {
  allGroupTables,
  buildStats,
  computeStandings,
  mock,
  type ApiItem,
  type ApiList,
  type Match,
  type MatchEvent,
  type Player,
  type StandingRow,
  type StatsBundle,
  type SyncStatus,
  type Team,
  type Venue,
} from '@worldcup/shared';
import type { PoolPick } from '@/store/pool';


const BASE = '/api';

async function safeGet<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback();
  }
}

function qs(params: object): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

/* ---------------- teams ---------------- */
export const fetchTeams = () =>
  safeGet<ApiList<Team>>('/teams', () => ({
    source: 'mock',
    count: mock.TEAMS.length,
    items: mock.TEAMS,
  }));

export const fetchTeam = (id: string) =>
  safeGet<ApiItem<Team>>(`/teams/${id}`, () => ({
    source: 'mock',
    item: mock.TEAMS.find((t) => t.code === id) ?? null,
  }));

/* ---------------- players ---------------- */
export interface PlayerFilters {
  team?: string;
  pos?: string;
  q?: string;
}
export const fetchPlayers = (f: PlayerFilters = {}) =>
  safeGet<ApiList<Player>>(`/players${qs(f)}`, () => {
    let items = mock.PLAYERS;
    if (f.team) items = items.filter((p) => p.team === f.team);
    if (f.pos) items = items.filter((p) => p.pos === f.pos);
    if (f.q) {
      const n = f.q.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(n) || p.club.toLowerCase().includes(n),
      );
    }
    return { source: 'mock', count: items.length, items };
  });

export const fetchPlayer = (id: string) =>
  safeGet<ApiItem<Player>>(`/players/${id}`, () => ({
    source: 'mock',
    item: mock.PLAYERS.find((p) => p.id === id) ?? null,
  }));

/* ---------------- matches ---------------- */
export interface MatchFilters {
  status?: string;
  group?: string;
  team?: string;
  stage?: string;
  venue?: string;
  date?: string;
}
export const fetchMatches = (f: MatchFilters = {}) =>
  safeGet<ApiList<Match>>(`/matches${qs(f)}`, () => {
    let items = mock.MATCHES;
    if (f.status) items = items.filter((m) => m.status === f.status);
    if (f.group) items = items.filter((m) => m.group === f.group);
    if (f.team) items = items.filter((m) => m.home === f.team || m.away === f.team);
    if (f.stage) items = items.filter((m) => m.stage === f.stage);
    if (f.venue) items = items.filter((m) => m.venue === f.venue);
    if (f.date) items = items.filter((m) => m.date === f.date);
    return { source: 'mock', count: items.length, items };
  });

export interface MatchDetail {
  source: 'mock' | 'sqlite';
  item: Match | null;
  events: MatchEvent[];
  venue: Venue | null;
}
export const fetchMatch = (id: string) =>
  safeGet<MatchDetail>(`/matches/${id}`, () => {
    const item = mock.MATCHES.find((m) => m.id === id) ?? null;
    return {
      source: 'mock',
      item,
      events: item ? mock.MATCH_EVENTS.filter((e) => e.matchId === id) : [],
      venue: item ? (mock.venueById[item.venue] ?? null) : null,
    };
  });

/* ---------------- venues ---------------- */
export const fetchVenues = () =>
  safeGet<ApiList<Venue>>('/venues', () => ({
    source: 'mock',
    count: mock.VENUES.length,
    items: mock.VENUES,
  }));

/* ---------------- standings / stats ---------------- */
export const fetchStandings = () =>
  safeGet<{ source: 'mock' | 'sqlite'; groups: Record<string, StandingRow[]> }>(
    '/standings',
    () => {
      const table = computeStandings(mock.TEAMS, mock.MATCHES);
      const letters = [...new Set(mock.TEAMS.map((t) => t.group))].sort();
      return { source: 'mock', groups: allGroupTables(letters, table) };
    },
  );

export const fetchStats = () =>
  safeGet<StatsBundle>('/stats', () =>
    buildStats(mock.TEAMS, mock.PLAYERS, mock.MATCHES, mock.GOALKEEPERS, 'mock'),
  );

export const fetchSyncStatus = () =>
  safeGet<SyncStatus>('/sync/status', () => ({
    source: 'mock',
    meta: mock.META,
    lastRun: null,
    dbExists: false,
    assetsTracked: 0,
  }));

export interface DataSyncCheck {
  ok: boolean;
  status: string;
  checkedAt: string;
  mode: 'manual' | 'cron' | 'local-fallback';
  cron: string;
  results: string;
  resultsSource?: string;
  nextAction?: string;
}

export const fetchDataSyncCheck = () =>
  safeGet<DataSyncCheck>('/data-sync?manual=1', () => ({
    ok: true,
    status: 'Flujo local listo',
    checkedAt: new Date().toISOString(),
    mode: 'local-fallback',
    cron: 'Diario 12:00 UTC en Vercel',
    results: 'Pendientes hasta el 11 de junio de 2026',
    resultsSource: 'not-configured',
    nextAction: 'Conectar feed de resultados autorizado cuando empiece el torneo.',
  }));

export interface PoolPersistenceStatus {
  mode: 'remote-libsql' | 'local-sqlite' | 'missing';
  ready: boolean;
  durable: boolean;
  label: string;
  detail: string;
}

export const fetchPoolStatus = () =>
  safeGet<{ ok: boolean; persistence: PoolPersistenceStatus }>('/pool/status', () => ({
    ok: true,
    persistence: {
      mode: 'missing',
      ready: false,
      durable: false,
      label: 'Base no verificada',
      detail: 'No se pudo consultar el estado de la base desde este navegador.',
    },
  }));

export interface MonitoringSnapshot {
  ok: boolean;
  usage: {
    provider: 'upstash' | 'memory';
    day: string;
    items: Record<string, number>;
  };
  pool: PoolPersistenceStatus;
  limits: Record<string, string>;
  ai: {
    configured: boolean;
    model: string;
  };
}

export const fetchMonitoring = () =>
  safeGet<MonitoringSnapshot>('/monitoring', () => ({
    ok: true,
    usage: {
      provider: 'memory',
      day: new Date().toISOString().slice(0, 10),
      items: {},
    },
    pool: {
      mode: 'missing',
      ready: false,
      durable: false,
      label: 'Monitoreo local',
      detail: 'Sin snapshot remoto disponible.',
    },
    limits: {},
    ai: { configured: false, model: 'gpt-4o-mini' },
  }));

export interface LeaderboardEntry {
  playerName: string;
  points: number;
  exactScores: number;
  outcomeHits: number;
  efficiency: number;
  predictedCount: number;
}

export const fetchLeaderboard = () =>
  safeGet<{ ok: boolean; leaderboard: LeaderboardEntry[] }>('/pool/leaderboard', () => ({
    ok: true,
    leaderboard: [],
  }));

export const fetchPoolPicks = (playerName: string) =>
  safeGet<{ ok: boolean; picks: Record<string, PoolPick> }>(
    `/pool/picks?playerName=${encodeURIComponent(playerName)}`,
    () => ({
      ok: true,
      picks: {},
    }),
  );

export async function syncPoolPicks(playerName: string, picks: Record<string, PoolPick>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/pool/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, picks }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Build a same-origin URL to a locally-stored asset (served only by the API). */
export const assetUrl = (assetId: string | null | undefined): string | null =>
  assetId ? `${BASE}/assets/${assetId}` : null;
