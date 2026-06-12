/**
 * Local API client. Talks to the loopback API through Vite's same-origin /api
 * proxy. If the API process is not running, it transparently falls back to the
 * bundled typed mock data so the UI always renders something useful.
 */
import {
  allGroupTables,
  applyMatchResults,
  buildStats,
  computeStandings,
  emptyOverlay,
  mock,
  type ApiItem,
  type ApiList,
  type LiveOverlay,
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
// firebase is imported dynamically inside the two pool functions below so the
// ~400KB SDK stays out of the main app shell and only loads on pool features.


const BASE = '/api';

// ── Data Confidence ─────────────────────────────────────────────────────────

export interface DataConfidence {
  calendar: 'official' | 'confirmed' | 'pending';
  teams: 'official' | 'confirmed' | 'pending';
  venues: 'official' | 'confirmed' | 'pending';
  players: 'estimated' | 'confirmed' | 'pending';
  results: 'official' | 'live' | 'pending';
  standings: 'derived' | 'pending';
}

export function getDataConfidence(matches: Array<{ status: string }>): DataConfidence {
  const hasResults = matches.some(m => m.status === 'FT');
  const hasLive = matches.some(m => m.status === 'LIVE');
  return {
    calendar: 'official',
    teams: 'official',
    venues: 'official',
    players: 'estimated',
    results: hasResults ? 'official' : hasLive ? 'live' : 'pending',
    standings: hasResults ? 'derived' : 'pending',
  };
}

// ── Live overlay (admin-published results/lineups, fetched at runtime) ──────────
// A single module-level cache primed by useLiveOverlaySync(). When the admin
// publishes a score, the matches the whole app reads are patched on the fly and
// standings/stats re-derive — no redeploy, no per-call refetch.
let LIVE_OVERLAY: LiveOverlay = emptyOverlay();
export function setLiveOverlay(o: LiveOverlay): void {
  LIVE_OVERLAY = o;
}
export function getLiveOverlay(): LiveOverlay {
  return LIVE_OVERLAY;
}
/** mock.MATCHES with any admin-published scores applied (status flips to FT/LIVE). */
function overlaidMatches(): Match[] {
  if (!Object.keys(LIVE_OVERLAY.results).length) return mock.MATCHES;
  return applyMatchResults(mock.MATCHES, LIVE_OVERLAY.results).matches;
}

/** mock.PLAYERS with any live goals/assists injected from the overlay. */
function overlaidPlayers(): typeof mock.PLAYERS {
  if (!LIVE_OVERLAY.playerStats || !Object.keys(LIVE_OVERLAY.playerStats).length) return mock.PLAYERS;
  return mock.PLAYERS.map(p => {
    const stats = LIVE_OVERLAY.playerStats![p.id];
    if (!stats) return p;
    return { ...p, goals: stats.goals, assists: stats.assists };
  });
}
export const fetchLiveOverlay = () => safeGet<LiveOverlay>('/live-data', () => emptyOverlay());

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
    let items = overlaidMatches();
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
    const item = overlaidMatches().find((m) => m.id === id) ?? null;
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
      const table = computeStandings(mock.TEAMS, overlaidMatches());
      const letters = [...new Set(mock.TEAMS.map((t) => t.group))].sort();
      return { source: 'mock', groups: allGroupTables(letters, table) };
    },
  );

export const fetchStats = () =>
  safeGet<StatsBundle>('/stats', () =>
    buildStats(mock.TEAMS, overlaidPlayers(), overlaidMatches(), mock.GOALKEEPERS, 'mock'),
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
  logs?: string[];
  errors?: string[];
  phases?: Array<{ id: string; label: string; status: 'ok' | 'wait' | 'error'; detail: string }>;
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
    logs: [`${new Date().toISOString()} · local · fallback`],
    errors: [],
    phases: [
      { id: 'calendar', label: 'Calendario', status: 'ok', detail: 'Snapshot local cargado.' },
      { id: 'results', label: 'Resultados', status: 'wait', detail: 'Feed pendiente.' },
      { id: 'redeploy', label: 'Redeploy', status: 'wait', detail: 'Se activa tras ingesta real.' },
    ],
  }));

export interface PoolPersistenceStatus {
  mode: 'cloud-firestore' | 'remote-libsql' | 'local-sqlite' | 'missing';
  ready: boolean;
  durable: boolean;
  label: string;
  detail: string;
}

export const fetchPoolStatus = () =>
  safeGet<{ ok: boolean; persistence: PoolPersistenceStatus }>('/pool/status', () => ({
    ok: true,
    persistence: {
      mode: 'cloud-firestore',
      ready: false,
      durable: true,
      label: 'Cloud Firestore sin verificar',
      detail: 'No se pudo verificar Firestore desde este navegador, pero la app conserva la configuracion del cliente.',
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

export interface AdminOpsSnapshot {
  ok: boolean;
  checkedAt: string;
  summary: {
    ready: number;
    pending: number;
    blocked: number;
  };
  actions: Array<{
    id: string;
    label: string;
    status: 'ready' | 'pending' | 'blocked';
    detail: string;
    command?: string;
  }>;
  dataGaps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'ready' | 'blocked';
    detail: string;
  }>;
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
      mode: 'cloud-firestore',
      ready: false,
      durable: true,
      label: 'Monitoreo local',
      detail: 'Sin snapshot remoto disponible; Firestore esta configurado en el cliente.',
    },
    limits: {
      analyst: '12 requests / 10 min por sesion o IP',
      poolAgent: '8 requests / 10 min por sesion o IP',
      poolScan: '6 requests / 10 min por sesion o IP',
      poolStorage: 'persistente en Cloud Firestore multi-dispositivo',
    },
    ai: { configured: false, model: 'local-fallback' },
  }));

export const fetchAdminOps = () =>
  safeGet<AdminOpsSnapshot>('/admin-ops', () => ({
    ok: true,
    checkedAt: new Date().toISOString(),
    summary: { ready: 2, pending: 3, blocked: 0 },
    actions: [
      {
        id: 'validate-feed',
        label: 'Validar feed real',
        status: 'pending',
        detail: 'Configura RESULTS_SOURCE_URL cuando tengas proveedor autorizado de marcadores.',
        command: 'vercel env add RESULTS_SOURCE_URL production',
      },
      {
        id: 'run-smoke',
        label: 'Smoke test producción',
        status: 'ready',
        detail: 'Comprueba home, datos, quiniela y analista contra el dominio público.',
        command: 'pnpm test:e2e',
      },
      {
        id: 'refresh-assets',
        label: 'Regenerar assets locales',
        status: 'ready',
        detail: 'Actualiza intel packs, galerías de sedes y kits generados/fallback.',
        command: 'pnpm assets:finalize && pnpm validate:data',
      },
    ],
    dataGaps: [
      {
        id: 'referees',
        label: 'Árbitros oficiales',
        status: 'pending',
        detail: 'Cargar cuando FIFA publique designaciones por partido; no se inventan nombres.',
      },
      {
        id: 'h2h',
        label: 'Historial H2H',
        status: 'pending',
        detail: 'Pipeline listo para una fuente histórica autorizada o curado manual.',
      },
      {
        id: 'final-squads',
        label: 'Convocatorias finales',
        status: 'pending',
        detail: 'Reemplazar por listas finales oficiales cuando existan.',
      },
    ],
  }));

export interface LeaderboardEntry {
  playerName: string;
  avatarUrl?: string;
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

export function normalizePoolGroupId(groupId: string): string {
  return groupId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'familia-2026';
}

export const poolMembersCollectionPath = (groupId: string) => ['poolGroups', normalizePoolGroupId(groupId), 'members'] as const;

export const fetchPoolPicks = async (playerName: string, groupId = 'familia-2026') => {
  try {
    const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
    const cleanGroup = normalizePoolGroupId(groupId);
    const docRef = cleanGroup
      ? doc(db, 'poolGroups', cleanGroup, 'members', playerName.trim())
      : doc(db, 'poolPicks', playerName.trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ok: true,
        picks: data.picks as Record<string, PoolPick>,
        avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
      };
    }
    return { ok: true, picks: {}, avatarUrl: '' };
  } catch {
    return { ok: false, picks: {}, avatarUrl: '' };
  }
};

export async function syncPoolPicks(
  playerName: string,
  picks: Record<string, PoolPick>,
  groupId = 'familia-2026',
  avatarUrl = '',
): Promise<boolean> {
  try {
    const [{ doc, setDoc }, { db }] = await Promise.all([import('firebase/firestore'), import('./firebase')]);
    const cleanGroup = normalizePoolGroupId(groupId);
    const cleanName = playerName.trim();
    const docRef = cleanGroup ? doc(db, 'poolGroups', cleanGroup, 'members', cleanName) : doc(db, 'poolPicks', cleanName);
    await setDoc(
      docRef,
      {
        picks,
        playerName: cleanName,
        avatarUrl: avatarUrl.trim().slice(0, 280),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

/** Build a same-origin URL to a locally-stored asset (served only by the API). */
export const assetUrl = (assetId: string | null | undefined): string | null =>
  assetId ? `${BASE}/assets/${assetId}` : null;

export interface AIScanResult {
  ok: boolean;
  predictions?: Record<string, { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' }>;
  reason?: string;
}

export async function scanPoolPaper(
  base64Image: string,
  matches: Array<{ id: string; home: string; away: string; homeName: string; awayName: string }>,
): Promise<AIScanResult> {
  try {
    const res = await fetch('/api/pool-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, matches }),
    });
    const data = (await res.json().catch(() => ({}))) as AIScanResult;
    if (!res.ok) return { ok: false, reason: data.reason ?? `http-${res.status}` };
    return data;
  } catch {
    return { ok: false, reason: 'network' };
  }
}
