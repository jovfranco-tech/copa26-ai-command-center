/**
 * Live overlay — the runtime layer that lets an admin update results/lineups
 * without a redeploy. A single JSON document (stored server-side in Vercel Blob)
 * holds score + lineup overrides keyed by match id. The app fetches it and layers
 * it on top of the static dataset: results feed applyMatchResults (standings
 * derive), lineups feed buildMatchLineups (the stadium shows the official XI).
 *
 * Everything here is pure + structurally validated so the same shapes are used by
 * the write endpoint (sanitize before storing) and the app (apply on read). The
 * lineup shape mirrors the stadium's OfficialMatchLineup so it can be passed
 * straight through.
 */
import type { MatchResultInput } from './applyResults.js';

export type ResultEntry = MatchResultInput;

export interface LineupStarter {
  shirt: number;
  name: string;
  pos: 'GK' | 'DF' | 'MF' | 'FW';
  playerId?: string;
}
export interface LineupSheet {
  formation: string;
  manager?: string;
  starters: LineupStarter[];
}
export interface LineupEntry {
  status: 'confirmada' | 'probable';
  source: string;
  home?: LineupSheet;
  away?: LineupSheet;
}

export interface PitchZoneInsights {
  stands: string;
  field: string;
  screens: string;
  lights: string;
}

export interface MatchAnalytics {
  confidence: number;
  tacticalRisk: number;
  momentum: number[];
  storyline: string;
  whatToWatch: string[];
  strategyHome: string;
  strategyAway: string;
  heatZones: { x: number; y: number; r: number; val: number }[];
  pitchZoneInsights?: PitchZoneInsights;
}

export interface PlayerStatsEntry {
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  saves: number;
}

export interface LiveOverlay {
  results: Record<string, ResultEntry>;
  lineups: Record<string, LineupEntry>;
  metrics: Record<string, MatchAnalytics>;
  playerStats?: Record<string, PlayerStatsEntry>;
  updatedAt: string | null;
}

export const emptyOverlay = (): LiveOverlay => ({ results: {}, lineups: {}, metrics: {}, playerStats: {}, updatedAt: null });

const MAX_ENTRIES = 80;
const MATCH_ID = /^M\d{1,4}$/;
const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;

const nonNegInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

function sanitizeSheet(raw: unknown): LineupSheet | undefined {
  const s = raw as Record<string, unknown> | undefined;
  if (!s || typeof s.formation !== 'string') return undefined;
  const starters = Array.isArray(s.starters) ? s.starters.slice(0, 11) : [];
  return {
    formation: str(s.formation, 12),
    manager: str(s.manager, 60),
    starters: starters.map((p) => {
      const e = (p ?? {}) as Record<string, unknown>;
      const pos = (POSITIONS as readonly string[]).includes(e.pos as string) ? (e.pos as LineupStarter['pos']) : 'MF';
      const out: LineupStarter = { shirt: nonNegInt(e.shirt) ?? 0, name: str(e.name, 60), pos };
      if (typeof e.playerId === 'string') out.playerId = e.playerId.slice(0, 20);
      return out;
    }),
  };
}

/** Coerce arbitrary parsed JSON into a safe, size-bounded LiveOverlay. */
export function sanitizeOverlay(raw: unknown): LiveOverlay {
  const o = (raw ?? {}) as Record<string, unknown>;
  const out = emptyOverlay();

  const rawResults = (o.results ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(rawResults).slice(0, MAX_ENTRIES)) {
    if (!MATCH_ID.test(id)) continue;
    const r = (rawResults[id] ?? {}) as Record<string, unknown>;
    out.results[id] = {
      homeGoals: nonNegInt(r.homeGoals),
      awayGoals: nonNegInt(r.awayGoals),
      status: r.status === 'LIVE' ? 'LIVE' : 'FT',
      minute: nonNegInt(r.minute),
      ...(r.source === 'manual' || r.source === 'auto' ? { source: r.source } : {}),
    };
  }

  const rawLineups = (o.lineups ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(rawLineups).slice(0, MAX_ENTRIES)) {
    if (!MATCH_ID.test(id)) continue;
    const l = (rawLineups[id] ?? {}) as Record<string, unknown>;
    const home = sanitizeSheet(l.home);
    const away = sanitizeSheet(l.away);
    if (!home && !away) continue;
    out.lineups[id] = {
      status: l.status === 'confirmada' ? 'confirmada' : 'probable',
      source: str(l.source, 120),
      ...(home ? { home } : {}),
      ...(away ? { away } : {}),
    };
  }

  const rawMetrics = (o.metrics ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(rawMetrics).slice(0, MAX_ENTRIES)) {
    if (!MATCH_ID.test(id)) continue;
    const m = rawMetrics[id] as Partial<MatchAnalytics>;
    if (m && typeof m.storyline === 'string') {
      out.metrics[id] = m as MatchAnalytics;
    }
  }

  const rawPlayerStats = (o.playerStats ?? {}) as Record<string, unknown>;
  out.playerStats = {};
  for (const id of Object.keys(rawPlayerStats).slice(0, 500)) {
    const p = (rawPlayerStats[id] ?? {}) as Record<string, unknown>;
    out.playerStats[id] = {
      goals: nonNegInt(p.goals) ?? 0,
      assists: nonNegInt(p.assists) ?? 0,
      yellow: nonNegInt(p.yellow) ?? 0,
      red: nonNegInt(p.red) ?? 0,
      saves: nonNegInt(p.saves) ?? 0,
    };
  }

  out.updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : null;
  return out;
}

export interface AdminOp {
  op: 'set-result' | 'clear-result' | 'set-lineup' | 'clear-lineup';
  matchId?: string;
  data?: unknown;
}

/** Apply a single admin operation to the overlay, returning a NEW overlay (or null if invalid). */
export function applyAdminOp(overlay: LiveOverlay, body: AdminOp): LiveOverlay | null {
  const next: LiveOverlay = {
    results: { ...overlay.results },
    lineups: { ...overlay.lineups },
    metrics: { ...overlay.metrics },
    playerStats: overlay.playerStats ? { ...overlay.playerStats } : {},
    updatedAt: overlay.updatedAt,
  };
  const id = typeof body?.matchId === 'string' ? body.matchId : '';
  if (!MATCH_ID.test(id)) return null;
  switch (body?.op) {
    case 'set-result':
      next.results[id] = (body.data ?? {}) as ResultEntry;
      return next;
    case 'clear-result':
      delete next.results[id];
      return next;
    case 'set-lineup':
      next.lineups[id] = (body.data ?? {}) as LineupEntry;
      return next;
    case 'clear-lineup':
      delete next.lineups[id];
      return next;
    default:
      return null;
  }
}
