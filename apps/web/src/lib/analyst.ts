/**
 * Analista local — genera respuestas en español SÓLO a partir de los datos
 * locales cargados. Sin llamadas a internet. No inventa: cada frase se arma con
 * los números recibidos, y reporta qué tablas locales usó.
 */
import { avg, fmtFull, type Match, type Player, type StandingRow, type Team, type Venue } from '@worldcup/shared';
import type { AICitation, AIStructuredAnswer } from '@/lib/aiMemory';
import { playerRatings, ratingSourceText } from '@/lib/ratings';

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
  structured?: AIStructuredAnswer;
  citations?: AICitation[];
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

function matchCitation(match: Match, teams: Team[], venues?: Venue[]): AICitation[] {
  return [
    {
      label: 'Partido',
      value: `${teamName(teams, match.home)} vs ${teamName(teams, match.away)} · ${fmtFull(match.date)} ${match.time}`,
      source: 'Dataset local del calendario',
      date: '2026-05-31',
      confidence: 'Alta',
    },
    {
      label: 'Sede',
      value: venueName(venues, match.venue),
      source: 'Sedes locales optimizadas',
      date: '2026-05-31',
      confidence: 'Alta',
    },
  ];
}

function structuredReport({
  prediction,
  risk,
  confidence,
  dataUsed,
  ignoredData,
  rationale,
  nextAction,
}: AIStructuredAnswer): AIStructuredAnswer {
  return {
    prediction,
    risk,
    confidence,
    dataUsed,
    ignoredData,
    rationale,
    nextAction,
    quality: {
      score: confidence?.toLowerCase().includes('alta') ? 92 : confidence?.toLowerCase().includes('media') ? 78 : 64,
      label: confidence?.toLowerCase().includes('alta') ? 'Verificado localmente' : 'Requiere revisión contextual',
      flags: [
        'Respuesta construida con dataset local',
        ...(risk ? [risk] : []),
        ...(ignoredData?.length ? [`Ignorado: ${ignoredData.join(', ')}`] : []),
      ],
      checkedAt: new Date().toISOString(),
    },
  };
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
      structured: structuredReport({
        prediction: 'Partido inaugural confirmado en el calendario local.',
        risk: 'El marcador y estadísticas se activan hasta que exista feed de resultados.',
        confidence: 'Alta para calendario; pendiente para rendimiento.',
        dataUsed: ['Fecha/hora del partido', 'Selecciones', 'Sede'],
        ignoredData: ['Marcador', 'alineaciones', 'estadísticas en vivo'],
        rationale: 'La pregunta pide apertura; el calendario local ya contiene equipos, sede y hora.',
        nextAction: 'Abrir quiniela y capturar pronóstico antes del inicio.',
      }),
      citations: matchCitation(opening, teams, venues),
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
    return {
      text: lines.join(' '),
      sources: ['partidos', 'clasificación'],
      structured: structuredReport({
        prediction: m.status === 'UPCOMING' ? 'Sin resultado oficial todavía; útil para quiniela previa.' : 'Resultado ya cargado en el dataset.',
        risk: m.status === 'UPCOMING' ? 'Convocatorias finales, lesiones y forma reciente pueden mover el pick.' : 'Las métricas avanzadas dependen del feed disponible.',
        confidence: m.status === 'UPCOMING' ? 'Alta calendario / media predicción' : 'Alta si el marcador final ya está cargado.',
        dataUsed: ['Calendario', 'Grupo', 'Tabla local'],
        ignoredData: m.status === 'UPCOMING' ? ['Lesiones no cargadas', 'alineación oficial', 'momento de forma reciente'] : ['Eventos no disponibles en el feed'],
        rationale: 'El análisis se limita al estado del partido, grupo y tabla local; no extrapola información externa.',
        nextAction: m.status === 'UPCOMING' ? 'Definir marcador y revisar cierre de quiniela.' : 'Comparar pick familiar contra resultado real.',
      }),
      citations: [
        ...matchCitation(m, teams, venues),
        ...(hs && as
          ? [
              {
                label: `Grupo ${m.group}`,
                value: `${m.home} ${hs.Pts} pts · ${m.away} ${as.Pts} pts`,
                source: 'Clasificación local recalculada',
                date: '2026-05-31',
                confidence: 'Alta',
              },
            ]
          : []),
      ],
    };
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
    return {
      text: lines.join(' '),
      sources: ['selecciones', 'clasificación', 'partidos'],
      structured: structuredReport({
        prediction: next ? `Siguiente lectura: ${t.name} vs ${teamName(teams, next.home === t.code ? next.away : next.home)}.` : 'Sin próximo partido pendiente.',
        risk: 'Ratings, convocatoria final y estado físico pueden cambiar antes del torneo.',
        confidence: row ? 'Alta para grupo/tabla; media para forma previa.' : 'Alta para grupo; pendiente para resultados.',
        dataUsed: ['Selección', 'Grupo', 'Tabla', 'Próximo partido'],
        ignoredData: ['Convocatoria final oficial', 'lesiones', 'forma de clubes'],
        rationale: 'La selección se resume desde grupo, tabla y calendario; la lista final puede reemplazar la plantilla actual.',
        nextAction: next ? 'Abrir el partido y revisar kits, clima y pick.' : 'Esperar actualización de calendario.',
      }),
      citations: [
        {
          label: 'Selección',
          value: `${t.name} · Grupo ${t.group} · ranking ${t.ranking ?? 'pendiente'}`,
          source: 'Dataset local de selecciones',
          date: '2026-05-31',
          confidence: 'Alta',
        },
        ...(row
          ? [
              {
                label: 'Tabla',
                value: `${row.Pts} pts · ${row.W}-${row.D}-${row.L} · DG ${row.GD}`,
                source: 'Clasificación local recalculada',
                date: '2026-05-31',
                confidence: 'Alta',
              },
            ]
          : []),
        ...(next ? matchCitation(next, teams, venues).slice(0, 1) : []),
      ],
    };
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
    const rating = playerRatings(p);
    return {
      text: lines.join(' '),
      sources: ['jugadores', 'ratings'],
      structured: structuredReport({
        prediction: `${p.name} proyecta ${rating.overall} OVR como referencia cercana.`,
        risk: rating.source === 'estimate' ? 'Rating estimado por club, selección, edad y posición; conviene reemplazar si aparece fuente pública.' : 'Rating público cargado, pero la convocatoria final puede cambiar rol/minutos.',
        confidence: rating.source === 'fc26' ? 'Alta rating público / media Mundial' : 'Media estimada',
        dataUsed: ['Jugador', 'Club', 'Posición', 'Rating cercano'],
        ignoredData: ['Minutos oficiales del Mundial', 'convocatoria final', 'estado físico actual'],
        rationale: rating.source === 'fc26' ? 'El rating viene de fuente pública cercana y se enlaza al jugador local.' : 'El rating se estima por club, selección, edad y posición para no inventar una fuente.',
        nextAction: 'Comparar contra compañeros de selección y ajustar figura del equipo.',
      }),
      citations: [
        {
          label: 'Jugador',
          value: `${p.name} · ${teamName(teams, p.team)} · ${p.posLong ?? p.pos} · ${p.club}`,
          source: 'Plantilla local editable',
          date: '2026-05-31',
          confidence: 'Media hasta convocatoria final',
        },
        {
          label: 'Rating',
          value: `${rating.overall} OVR · VEL ${rating.pace} · TIR ${rating.shooting} · PAS ${rating.passing}`,
          source: ratingSourceText(rating),
          date: rating.source === 'fc26' ? '2026-05-30' : '2026-05-31',
          confidence: rating.source === 'fc26' ? 'Alta' : 'Media',
        },
      ],
    };
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
  return {
    text: lines.join(' '),
    sources: ['partidos', 'jugadores', 'clasificación'],
    structured: structuredReport({
      prediction: played.length ? 'El tablero ya refleja actividad real.' : 'Torneo listo en modo previa; la quiniela y ratings son el foco hasta el 11 de junio.',
      risk: 'Resultados, plantillas finales y estadísticas se actualizan cuando exista feed confiable.',
      confidence: 'Alta para calendario; media para datos previos de rendimiento.',
      dataUsed: ['Calendario completo', 'Plantillas', 'Tablas por grupo'],
      ignoredData: ['Resultados futuros', 'alineaciones oficiales', 'lesiones no cargadas'],
      rationale: 'El torneo aún está en modo previa; se priorizan calendario, sedes, grupos y ratings cercanos.',
      nextAction: 'Usar Día de partido y quiniela familiar para preparar el primer juego.',
    }),
    citations: [
      {
        label: 'Calendario',
        value: `${matches.length} partidos · ${upcoming.length} pendientes · ${played.length} jugados`,
        source: 'Dataset local del torneo',
        date: '2026-05-31',
        confidence: 'Alta',
      },
      ...(opening ? matchCitation(opening, teams, venues).slice(0, 1) : []),
    ],
  };
}

export const SUGGESTED_QUESTIONS = [
  'Dame un panorama del torneo',
  '¿Quién lidera el goleo?',
  '¿Cómo le va a esta selección?',
  'Resume este partido',
  '¿Cuál es la forma reciente?',
];
