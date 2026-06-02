import type { Match, Team } from '@worldcup/shared';
import type { LeaderboardEntry } from '@/lib/api';
import type { PoolPick } from '@/store/pool';

export type OpsTone = 'ok' | 'warn' | 'info';

export interface RecommendedPick {
  pick: PoolPick;
  label: string;
  confidence: 'Alta' | 'Media' | 'Baja';
  rationale: string;
  risk: string;
}

export interface PoolDiagnostics {
  totalPending: number;
  pickedPending: number;
  completeScores: number;
  missingWinner: number;
  missingScore: number;
  coveragePct: number;
  scorePct: number;
  styleLabel: string;
  styleDetail: string;
  leaderLabel: string;
  familySignal: string;
  recommendedAction: string;
}

export interface DataReadinessInput {
  teams: number;
  matches: number;
  players: number;
  venues: number;
  estimatedRatings: number;
  resultsSource?: string;
  poolDurable?: boolean;
  aiConfigured?: boolean;
  errors?: number;
}

export interface DataReadiness {
  score: number;
  label: string;
  status: OpsTone;
  checks: Array<{
    id: string;
    label: string;
    status: OpsTone;
    detail: string;
  }>;
  nextActions: string[];
}

export interface DayBrief {
  title: string;
  subtitle: string;
  highlights: string[];
  nextAction: string;
}

function rankOf(teams: Team[], code: string): number {
  return teams.find((team) => team.code === code)?.ranking ?? 80;
}

function teamName(teams: Team[], code: string): string {
  return teams.find((team) => team.code === code)?.name ?? code;
}

function sortedUpcoming(matches: Match[]): Match[] {
  return matches
    .filter((match) => match.status === 'UPCOMING')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function recommendPick(match: Match, teams: Team[]): RecommendedPick {
  const homeRank = rankOf(teams, match.home);
  const awayRank = rankOf(teams, match.away);
  const diff = awayRank - homeRank;
  const absDiff = Math.abs(diff);

  if (absDiff <= 4) {
    return {
      pick: { outcome: 'draw', homeGoals: 1, awayGoals: 1 },
      label: 'Empate 1-1',
      confidence: 'Baja',
      rationale: 'Ranking muy cercano; conviene marcador corto y reversible.',
      risk: 'Un gol temprano cambia mucho el guion del partido.',
    };
  }

  const homeBetter = diff > 0;
  const clearEdge = absDiff >= 18;
  const score = clearEdge ? (homeBetter ? '2-0' : '0-2') : homeBetter ? '1-0' : '0-1';
  const [homeGoals = 1, awayGoals = 0] = score.split('-').map(Number);

  return {
    pick: {
      outcome: homeBetter ? 'home' : 'away',
      homeGoals,
      awayGoals,
    },
    label: `${homeBetter ? teamName(teams, match.home) : teamName(teams, match.away)} ${score}`,
    confidence: clearEdge ? 'Alta' : 'Media',
    rationale: `Diferencia de ranking ${absDiff}; el modelo local privilegia baja varianza.`,
    risk: 'No incluye convocatoria final, lesiones ni forma de la semana del partido.',
  };
}

export function buildRecommendedPicks(matches: Match[], teams: Team[], limit = 24): Record<string, PoolPick> {
  return Object.fromEntries(
    sortedUpcoming(matches)
      .slice(0, limit)
      .map((match) => [match.id, recommendPick(match, teams).pick]),
  );
}

export function buildDayBrief(matches: Match[], teams: Team[], picks: Record<string, PoolPick>): DayBrief {
  const upcoming = sortedUpcoming(matches);
  const next = upcoming[0];
  if (!next) {
    return {
      title: 'Sin partidos pendientes',
      subtitle: 'El calendario no tiene próximos juegos abiertos.',
      highlights: ['Revisar resultados y tabla.', 'Actualizar estadísticas si ya hay marcadores.'],
      nextAction: 'Ir al Centro de datos para validar estado.',
    };
  }

  const dayMatches = upcoming.filter((match) => match.date === next.date);
  const missing = dayMatches.filter((match) => !picks[match.id]?.outcome).length;
  const complete = dayMatches.filter((match) => {
    const pick = picks[match.id];
    return pick?.homeGoals != null && pick.awayGoals != null;
  }).length;
  const rec = recommendPick(next, teams);

  return {
    title: `${teamName(teams, next.home)} vs ${teamName(teams, next.away)}`,
    subtitle: `${next.date} · ${next.time || 'hora pendiente'} · ${next.venue}`,
    highlights: [
      `${dayMatches.length} partidos en el día destacado.`,
      `${missing} picks del día sin ganador.`,
      `${complete}/${dayMatches.length} marcadores completos.`,
      `Sugerencia local: ${rec.label} (${rec.confidence}).`,
    ],
    nextAction: missing ? 'Completar picks del día antes del cierre.' : 'Revisar marcadores y compartir predicción.',
  };
}

export function buildPoolDiagnostics(
  matches: Match[],
  picks: Record<string, PoolPick>,
  leaderboard: LeaderboardEntry[] = [],
  playerName = '',
): PoolDiagnostics {
  const upcoming = sortedUpcoming(matches);
  const pickedPending = upcoming.filter((match) => picks[match.id]?.outcome).length;
  const completeScores = upcoming.filter((match) => {
    const pick = picks[match.id];
    return pick?.homeGoals != null && pick.awayGoals != null;
  }).length;
  const scoredPicks = Object.values(picks).filter((pick) => pick.homeGoals != null && pick.awayGoals != null);
  const drawCount = Object.values(picks).filter((pick) => pick.outcome === 'draw').length;
  const avgGoals =
    scoredPicks.length > 0
      ? scoredPicks.reduce((sum, pick) => sum + (pick.homeGoals ?? 0) + (pick.awayGoals ?? 0), 0) / scoredPicks.length
      : 0;
  const drawShare = Object.keys(picks).length ? drawCount / Object.keys(picks).length : 0;
  const coveragePct = upcoming.length ? Math.round((pickedPending / upcoming.length) * 100) : 100;
  const scorePct = upcoming.length ? Math.round((completeScores / upcoming.length) * 100) : 100;
  const humanRows = leaderboard.filter((row) => !row.playerName.startsWith('🤖'));
  const leader = humanRows[0] ?? leaderboard[0];
  const userRow = playerName
    ? leaderboard.find((row) => row.playerName.trim().toLowerCase() === playerName.trim().toLowerCase())
    : undefined;
  const aiLeader = Boolean(leaderboard[0]?.playerName.startsWith('🤖'));

  let styleLabel = 'Perfil por definir';
  let styleDetail = 'Captura más picks para que la app aprenda tu patrón.';
  if (scoredPicks.length >= 3) {
    if (avgGoals >= 3.2) {
      styleLabel = 'Agresivo';
      styleDetail = `Promedio ${avgGoals.toFixed(1)} goles por pick; útil para remontadas, riesgoso en fase cerrada.`;
    } else if (drawShare >= 0.3) {
      styleLabel = 'Conservador de empates';
      styleDetail = `${Math.round(drawShare * 100)}% de picks al empate; bueno para cruces parejos.`;
    } else {
      styleLabel = 'Baja varianza';
      styleDetail = `Promedio ${avgGoals.toFixed(1)} goles por pick; prioriza ganador antes que marcador amplio.`;
    }
  }

  return {
    totalPending: upcoming.length,
    pickedPending,
    completeScores,
    missingWinner: Math.max(0, upcoming.length - pickedPending),
    missingScore: Math.max(0, upcoming.length - completeScores),
    coveragePct,
    scorePct,
    styleLabel,
    styleDetail,
    leaderLabel: leader ? `${leader.playerName} · ${leader.points} pts` : 'Sin tabla todavía',
    familySignal: aiLeader
      ? 'Los co-pilotos IA están arriba; conviene revisar picks conservadores.'
      : userRow
        ? `Tu fila tiene ${userRow.points} pts y ${userRow.efficiency}% de efectividad.`
        : humanRows.length
          ? `${humanRows.length} participantes humanos sincronizados.`
          : 'Invita familiares para activar lectura grupal.',
    recommendedAction:
      coveragePct < 80
        ? 'Completar ganadores pendientes.'
        : scorePct < 80
          ? 'Cerrar marcadores para tarjetas compartibles.'
          : 'Revisar partidos inciertos antes del cierre.',
  };
}

export function buildDataReadiness(input: DataReadinessInput): DataReadiness {
  const checks: DataReadiness['checks'] = [
    {
      id: 'calendar',
      label: 'Calendario',
      status: input.matches >= 100 && input.teams >= 48 ? 'ok' : 'warn',
      detail: `${input.matches} partidos · ${input.teams} selecciones`,
    },
    {
      id: 'assets',
      label: 'Assets base',
      status: input.venues >= 16 && input.players >= 200 ? 'ok' : 'warn',
      detail: `${input.venues} sedes · ${input.players} jugadores`,
    },
    {
      id: 'ratings',
      label: 'Ratings',
      status: input.estimatedRatings === 0 ? 'ok' : input.estimatedRatings <= 48 ? 'info' : 'warn',
      detail: input.estimatedRatings ? `${input.estimatedRatings} estimados por revisar` : 'Ratings cubiertos',
    },
    {
      id: 'results',
      label: 'Resultados',
      status: input.resultsSource === 'configured' ? 'ok' : 'warn',
      detail: input.resultsSource === 'configured' ? 'Feed conectado' : 'Feed real pendiente',
    },
    {
      id: 'pool',
      label: 'Quiniela',
      status: input.poolDurable ? 'ok' : 'warn',
      detail: input.poolDurable ? 'Persistencia durable' : 'Persistencia por verificar',
    },
    {
      id: 'ai',
      label: 'IA',
      status: input.aiConfigured ? 'ok' : 'info',
      detail: input.aiConfigured ? 'Proveedor configurado' : 'Fallback local disponible',
    },
  ];

  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.status === 'ok' ? 100 : check.status === 'info' ? 70 : 35), 0) /
      checks.length,
  );
  const nextActions = checks
    .filter((check) => check.status !== 'ok')
    .slice(0, 3)
    .map((check) => {
      if (check.id === 'results') return 'Conectar feed autorizado de resultados al iniciar el torneo.';
      if (check.id === 'ratings') return 'Revisar jugadores con rating estimado tras convocatorias finales.';
      if (check.id === 'pool') return 'Verificar Firestore y reglas antes de compartir masivamente.';
      if (check.id === 'ai') return 'Mantener límites y fallback local para invitados.';
      return `Revisar ${check.label.toLowerCase()}.`;
    });

  return {
    score,
    label: score >= 88 ? 'Listo para compartir' : score >= 70 ? 'Operativo con pendientes' : 'Requiere revisión',
    status: score >= 88 ? 'ok' : score >= 70 ? 'info' : 'warn',
    checks,
    nextActions: nextActions.length ? nextActions : ['Monitorear cron diario y resultados reales.'],
  };
}
