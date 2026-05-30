/**
 * Analista local — genera respuestas en español SÓLO a partir de los datos
 * locales cargados. Sin llamadas a internet. No inventa: cada frase se arma con
 * los números recibidos, y reporta qué tablas locales usó.
 */
import { avg, fmtFull, type Match, type Player, type StandingRow, type Team, type Venue } from '@worldcup/shared';

export interface AnalystInput {
  question: string;
  ctx: 'tournament' | 'match' | 'team' | 'player';
  id?: string;
  teams: Team[];
  players: Player[];
  matches: Match[];
  venues?: Venue[];
  standings: Record<string, StandingRow[]>;
}

export interface AnalystAnswer {
  text: string;
  sources: string[];
}

function teamName(teams: Team[], code: string): string {
  return teams.find((t) => t.code === code)?.name ?? code;
}

function venueName(venues: Venue[] | undefined, id: string): string {
  const v = venues?.find((x) => x.id === id);
  return v ? `${v.stadium}, ${v.city}` : id;
}

function firstMatch(matches: Match[]): Match | undefined {
  return [...matches].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
}

export function buildAnalystAnswer(input: AnalystInput): AnalystAnswer {
  const { ctx, id, teams, players, matches, venues, standings } = input;
  const q = input.question.toLowerCase();
  const played = matches.filter((m) => m.status === 'FT');
  const goals = played.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const scorers = [...players].sort((a, b) => b.goals - a.goals);
  const opening = firstMatch(matches);
  const asksOpening =
    q.includes('primer partido') ||
    q.includes('partido inaugural') ||
    q.includes('inaugural') ||
    q.includes('apertura') ||
    q.includes('arranca') ||
    q.includes('inicia');

  if (asksOpening && opening) {
    return {
      text: `El primer partido confirmado en el calendario es ${teamName(teams, opening.home)} vs ${teamName(teams, opening.away)} el ${fmtFull(opening.date)} a las ${opening.time}, en ${venueName(venues, opening.venue)} (${opening.stage}).`,
      sources: ['partidos', 'sedes'],
    };
  }

  if (ctx === 'match' && id) {
    const m = matches.find((x) => x.id === id);
    if (!m) return { text: 'Ese partido no está en el dataset.', sources: ['partidos'] };
    const h = teamName(teams, m.home);
    const a = teamName(teams, m.away);
    const lines: string[] = [];
    if (m.status === 'UPCOMING') {
      lines.push(`${h} se enfrenta a ${a} el ${fmtFull(m.date)} a las ${m.time} (${m.stage}).`);
    } else {
      lines.push(
        `${h} ${m.homeGoals}–${m.awayGoals} ${a} (${m.status === 'LIVE' ? `en vivo, ${m.minute}'` : 'final'}, ${m.stage}).`,
      );
      if (m.possH != null) lines.push(`La posesión fue ${m.possH}% / ${100 - m.possH}%, tiros ${m.shotsH ?? 0}–${m.shotsA ?? 0}.`);
    }
    const hs = standings[m.group]?.find((r) => r.team === m.home);
    const as = standings[m.group]?.find((r) => r.team === m.away);
    if (hs && as) lines.push(`En el Grupo ${m.group}, ${m.home} tiene ${hs.Pts} pts y ${m.away} ${as.Pts} pts.`);
    return { text: lines.join(' '), sources: ['partidos', 'clasificación'] };
  }

  if (ctx === 'team' && id) {
    const t = teams.find((x) => x.code === id);
    if (!t) return { text: 'Esa selección no está en el dataset.', sources: ['selecciones'] };
    const row = standings[t.group]?.find((r) => r.team === t.code);
    const topTeamScorer = scorers.find((p) => p.team === t.code);
    const next = matches.find((m) => (m.home === t.code || m.away === t.code) && m.status !== 'FT');
    const lines: string[] = [];
    if (row)
      lines.push(
        `${t.name} está en el Grupo ${t.group} con ${row.Pts} pts (${row.W}-${row.D}-${row.L}), DG ${row.GD >= 0 ? '+' : ''}${row.GD}.`,
      );
    else lines.push(`${t.name} está en el Grupo ${t.group}. El torneo aún no comienza, sin partidos jugados.`);
    if (topTeamScorer && topTeamScorer.goals > 0)
      lines.push(`Su goleador es ${topTeamScorer.name} con ${topTeamScorer.goals} goles.`);
    if (q.includes('forma') && row) lines.push(`Forma reciente: ${row.form.join('-') || 'aún sin partidos'}.`);
    if (next) {
      const opp = next.home === t.code ? next.away : next.home;
      lines.push(`Próximo: ${teamName(teams, opp)} el ${fmtFull(next.date)}.`);
    }
    return { text: lines.join(' '), sources: ['selecciones', 'clasificación', 'partidos'] };
  }

  if (ctx === 'player' && id) {
    const p = players.find((x) => x.id === id);
    if (!p) return { text: 'Ese jugador no está en el dataset.', sources: ['jugadores'] };
    const rank = scorers.findIndex((x) => x.id === p.id) + 1;
    const lines = [
      `${p.name} (${teamName(teams, p.team)}, ${p.posLong ?? p.pos}, ${p.club}) lleva ${p.goals} goles y ${p.assists} asistencias en ${p.minutes} minutos.`,
    ];
    if (p.goals > 0) lines.push(`Eso lo ubica #${rank} entre los goleadores locales.`);
    if (p.yellow || p.red) lines.push(`Disciplina: ${p.yellow} amarillas, ${p.red} rojas.`);
    return { text: lines.join(' '), sources: ['jugadores'] };
  }

  // torneo (por defecto)
  const leaderA = standings.A?.[0];
  const top = scorers[0];
  const upcoming = matches.filter((m) => m.status === 'UPCOMING');
  const lines: string[] = [];
  if (played.length) {
    lines.push(`En ${played.length} partidos jugados se han marcado ${goals} goles (${avg(goals, played.length)} por partido).`);
  } else {
    lines.push(
      `El Mundial 2026 aún no comienza (arranca el 11 de junio). Hay ${upcoming.length} partidos programados en 16 sedes de Canadá, EE. UU. y México.`,
    );
    if (opening) {
      lines.push(
        `El partido inaugural del calendario es ${teamName(teams, opening.home)} vs ${teamName(teams, opening.away)} el ${fmtFull(opening.date)} a las ${opening.time}.`,
      );
    }
  }
  if (top && top.goals > 0) lines.push(`${top.name} lidera el goleo con ${top.goals} goles y ${top.assists} asistencias.`);
  if (leaderA) {
    lines.push(
      played.length
        ? `El Grupo A lo lidera ${teamName(teams, leaderA.team)} con ${leaderA.Pts} pts.`
        : `Por ejemplo, el Grupo A lo integran ${(standings.A ?? []).map((r) => teamName(teams, r.team)).join(', ')}.`,
    );
  }
  if (q.includes('vivo')) {
    const live = matches.filter((m) => m.status === 'LIVE');
    lines.push(live.length ? `${live.length} partido(s) en vivo ahora.` : 'No hay partidos en vivo ahora.');
  }
  return { text: lines.join(' '), sources: ['partidos', 'jugadores', 'clasificación'] };
}

export const SUGGESTED_QUESTIONS = [
  'Dame un panorama del torneo',
  '¿Quién lidera el goleo?',
  '¿Cómo le va a esta selección?',
  'Resume este partido',
  '¿Cuál es la forma reciente?',
];
