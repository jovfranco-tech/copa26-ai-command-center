/**
 * Calls the server-side AI analyst (/api/analyst). Builds a compact, GROUNDED
 * Spanish context from the local data and sends it; the OpenAI key never touches
 * the client. Falls back to the offline analyst when the function says 'no-key'.
 */
import type { Match, Player, StandingRow, Team } from '@worldcup/shared';

export interface AIData {
  teams: Team[];
  players: Player[];
  matches: Match[];
  standings: Record<string, StandingRow[]>;
}

const tName = (teams: Team[], code: string) => teams.find((t) => t.code === code)?.name ?? code;

export function buildAIContext(ctx: string, id: string | undefined, d: AIData): string {
  const played = d.matches.filter((m) => m.status === 'FT');
  const lines: string[] = [
    `Mundial 2026 (Canadá/EE. UU./México), 48 selecciones, 12 grupos. Arranca el 11-jun-2026.`,
    `Partidos jugados: ${played.length}/${d.matches.length} (si es 0, el torneo no ha comenzado y no hay resultados ni estadísticas).`,
  ];

  if (ctx === 'team' && id) {
    const t = d.teams.find((x) => x.code === id);
    if (t) {
      lines.push(`Selección consultada: ${t.name} (Grupo ${t.group}).`);
      const squad = d.players.filter((p) => p.team === id).map((p) => `${p.name} (${p.pos}, ${p.club})`);
      if (squad.length) lines.push(`Jugadores destacados (no convocatoria oficial): ${squad.join('; ')}.`);
      const fixtures = d.matches
        .filter((m) => m.home === id || m.away === id)
        .map((m) => `${tName(d.teams, m.home)}-${tName(d.teams, m.away)} (${m.date})`);
      if (fixtures.length) lines.push(`Partidos de grupo: ${fixtures.join('; ')}.`);
    }
  } else if (ctx === 'player' && id) {
    const p = d.players.find((x) => x.id === id);
    if (p)
      lines.push(
        `Jugador consultado: ${p.name} — ${p.posLong ?? p.pos}, ${p.club}, ${tName(d.teams, p.team)}, dorsal ${p.number ?? '?'}. Estadísticas de torneo en 0 (aún no juega).`,
      );
  } else if (ctx === 'match' && id) {
    const m = d.matches.find((x) => x.id === id);
    if (m)
      lines.push(
        `Partido consultado: ${tName(d.teams, m.home)} vs ${tName(d.teams, m.away)}, ${m.date} ${m.time}, ${m.stage}. Estado: ${m.status}. Marcador: ${m.homeGoals ?? '-'}–${m.awayGoals ?? '-'}.`,
      );
  } else {
    for (const [g, rows] of Object.entries(d.standings)) {
      lines.push(`Grupo ${g}: ${rows.map((r) => tName(d.teams, r.team)).join(', ')}.`);
    }
  }
  return lines.join('\n');
}

export interface AIResult {
  ok: boolean;
  answer?: string;
  reason?: string;
}

export async function askAI(question: string, context: string): Promise<AIResult> {
  try {
    const res = await fetch('/api/analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });
    const data = (await res.json().catch(() => ({}))) as AIResult;
    if (!res.ok) return { ok: false, reason: data.reason ?? `http-${res.status}` };
    return data;
  } catch {
    return { ok: false, reason: 'network' };
  }
}
