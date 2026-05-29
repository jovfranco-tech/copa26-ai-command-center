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

/** Build a same-origin URL to a locally-stored asset (served only by the API). */
export const assetUrl = (assetId: string | null | undefined): string | null =>
  assetId ? `${BASE}/assets/${assetId}` : null;
