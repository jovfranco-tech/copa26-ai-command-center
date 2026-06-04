/**
 * Official matchday team sheets, keyed by match id (e.g. "M001").
 *
 * PRE-TOURNAMENT STATE: this is intentionally empty. Every match in the 3D
 * stadium therefore falls back to an *estimated* XI generated from the curated
 * squad + a characteristic formation (see stadiumDataMapper.buildMatchLineups).
 *
 * ON MATCHDAY: once a lineup is confirmed by a public/official source, add an
 * entry here and redeploy — the stadium will switch that match to the real XI
 * and the badge flips from "Estimada" to "Oficial". Nothing else changes.
 *
 * Honesty rule (project policy): only put `status: 'confirmada'` for an XI you
 * actually sourced. Use `status: 'probable'` for press-predicted lineups so the
 * UI never claims an estimate is official.
 *
 * Authoring shape (example — keep COMMENTED until it's real):
 *
 *   M001: {
 *     status: 'confirmada',
 *     source: 'Alineación oficial — sala de prensa',
 *     home: {
 *       formation: '4-3-3',
 *       manager: 'Javier Aguirre',
 *       starters: [
 *         { shirt: 1,  name: 'Guillermo Ochoa',  pos: 'GK', playerId: 'MEX-1' },
 *         { shirt: 2,  name: 'Jorge Sánchez',    pos: 'DF' },
 *         // ...11 total, ordered GK → DF → MF → FW, matching the formation
 *       ],
 *     },
 *     away: { formation: '4-3-3', manager: 'Hugo Broos', starters: [ /* 11 *\/ ] },
 *   },
 *
 * `playerId` is optional — when present it links to PLAYERS ({TEAM}-{n}) so the
 * player inherits real ratings / club / age; when absent the entry still renders
 * with neutral defaults.
 */

export interface OfficialLineupEntry {
  shirt: number;
  name: string;
  pos: 'GK' | 'DF' | 'MF' | 'FW';
  /** Optional FK to PLAYERS ({TEAM}-{n}) for ratings/club/age enrichment. */
  playerId?: string;
}

export interface OfficialTeamSheet {
  /** e.g. '4-3-3' — outfield digits must sum to 10. */
  formation: string;
  manager?: string;
  /** Exactly 11, ordered GK → DF → MF → FW to match the formation lines. */
  starters: OfficialLineupEntry[];
}

export interface OfficialMatchLineup {
  /** 'confirmada' = real official sheet; 'probable' = press-predicted. */
  status: 'confirmada' | 'probable';
  /** Human-readable attribution shown in the UI / brief. */
  source: string;
  /** Either side may be absent (e.g. only one XI confirmed yet → "mixed"). */
  home?: OfficialTeamSheet;
  away?: OfficialTeamSheet;
}

/**
 * Empty until matchday. Populate per-match (see the commented example above),
 * then redeploy. The data-integrity tests validate every entry's shape, so a
 * malformed sheet can never reach production.
 */
export const OFFICIAL_LINEUPS: Record<string, OfficialMatchLineup> = {};
