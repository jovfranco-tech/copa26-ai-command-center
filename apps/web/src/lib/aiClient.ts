/**
 * Calls the server-side AI analyst (/api/analyst). Builds a compact, GROUNDED
 * Spanish context from the local data and sends it; the AI provider key never
 * touches the client. Falls back to the offline analyst when the function says 'no-key'.
 */
import type { Match, Player, StandingRow, Team, Venue } from '@worldcup/shared';

export interface AIData {
  teams: Team[];
  players: Player[];
  matches: Match[];
  venues?: Venue[];
  standings: Record<string, StandingRow[]>;
}

const tName = (teams: Team[], code: string) => teams.find((t) => t.code === code)?.name ?? code;
const venueName = (venues: Venue[] | undefined, id: string) => {
  const v = venues?.find((x) => x.id === id);
  return v ? `${v.stadium}, ${v.city}` : id;
};
const byKickoff = (a: Match, b: Match) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

export function buildAIContext(ctx: string, id: string | undefined, d: AIData): string {
  const played = d.matches.filter((m) => m.status === 'FT');
  const opening = [...d.matches].sort(byKickoff)[0];
  const lines: string[] = [
    `Mundial 2026 (Canadá/EE. UU./México), 48 selecciones, 12 grupos. Arranca el 11-jun-2026.`,
    `Partidos jugados: ${played.length}/${d.matches.length} (si es 0, el torneo no ha comenzado y no hay resultados ni estadísticas).`,
  ];
  if (opening) {
    lines.push(
      `Partido inaugural confirmado en el calendario local: ${tName(d.teams, opening.home)} vs ${tName(d.teams, opening.away)} (${opening.home}-${opening.away}), ${opening.date} ${opening.time}, ${opening.stage}, sede ${venueName(d.venues, opening.venue)}.`,
    );
  }

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
    const firstUpcoming = [...d.matches].filter((m) => m.status === 'UPCOMING').sort(byKickoff).slice(0, 6);
    if (firstUpcoming.length) {
      lines.push(
        `Primeros partidos programados: ${firstUpcoming
          .map((m) => `${tName(d.teams, m.home)} vs ${tName(d.teams, m.away)} (${m.date} ${m.time})`)
          .join('; ')}.`,
      );
    }
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
  retryAfter?: number;
  meta?: {
    provider?: string;
    model?: string;
    confidence?: string;
    contextChars?: number;
    tools?: string[];
    sources?: string[];
  };
}

export async function askAI(
  question: string,
  context: string,
  pdf?: { name: string; data: string },
  audio?: { name: string; data: string },
  onToken?: (partial: string) => void,
  onMeta?: (meta: AIResult['meta']) => void,
): Promise<AIResult> {
  try {
    const res = await fetch('/api/analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Ask for a streamed answer only when the caller wants progressive tokens.
      body: JSON.stringify({ question, context, pdf, audio, stream: !!onToken }),
    });

    // Streaming response: a plain-text token stream with meta in the x-ai-meta header.
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && res.body && onToken && !contentType.includes('application/json')) {
      let meta: AIResult['meta'] | undefined;
      try {
        const raw = res.headers.get('x-ai-meta');
        if (raw) meta = JSON.parse(raw) as AIResult['meta'];
      } catch {
        /* ignore malformed meta header */
      }
      if (meta && onMeta) onMeta(meta);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';
      let lastFlush = Date.now();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const now = Date.now();
        if (buffer.length >= 4 || now - lastFlush > 50) {
          full += buffer;
          onToken(full);
          buffer = '';
          lastFlush = now;
        }
      }
      if (buffer) {
        full += buffer;
        onToken(full);
      }
      full += decoder.decode();
      if (!full.trim()) return { ok: false, reason: 'empty-answer', meta };
      return { ok: true, answer: full, meta };
    }

    // Non-streaming response (no-key fallback, rate-limit, errors, or stream:false).
    const data = (await res.json().catch(() => ({}))) as AIResult;
    if (!res.ok) {
      return {
        ok: false,
        reason: data.reason ?? `http-${res.status}`,
        retryAfter: data.retryAfter,
        meta: data.meta,
      };
    }
    return data;
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export interface AIPoolAgentResult {
  ok: boolean;
  brief?: string;
  predictions?: Record<string, { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' }>;
  reason?: string;
  meta?: {
    confidence?: string;
    dataUsed?: string[];
    ignoredData?: string[];
    warning?: string;
  };
}

export async function askPoolAgent(
  agent: 'optimista' | 'stats' | 'contrarian',
  matches: Array<{
    id: string;
    home: string;
    away: string;
    homeName: string;
    awayName: string;
    date?: string;
    time?: string;
    stage?: string;
    venueName?: string;
    weatherLabel?: string;
    weatherConfidence?: string;
    dataConfidence?: string;
  }>,
): Promise<AIPoolAgentResult> {
  try {
    const res = await fetch('/api/pool-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, matches }),
    });
    const data = (await res.json().catch(() => ({}))) as AIPoolAgentResult;
    if (!res.ok) return { ok: false, reason: data.reason ?? `http-${res.status}` };
    return data;
  } catch {
    return { ok: false, reason: 'network' };
  }
}
