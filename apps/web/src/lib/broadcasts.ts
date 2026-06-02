import type { Match, Team } from '@worldcup/shared';

export interface BroadcastProvider {
  id: string;
  label: string;
  region: string;
  language: string;
  url: string;
  platform: string;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface BroadcastGuide {
  providers: BroadcastProvider[];
  priority: 'Alta' | 'Media' | 'Normal';
  headline: string;
  note: string;
}

const HOST_TEAMS = new Set(['MEX', 'USA', 'CAN']);
const MARQUEE_TEAMS = new Set(['MEX', 'USA', 'BRA', 'ARG', 'FRA', 'ESP', 'ENG', 'GER', 'POR']);

export const OFFICIAL_BROADCASTERS: BroadcastProvider[] = [
  {
    id: 'vix-mx',
    label: 'ViX Pase Mundial',
    region: 'México',
    language: 'Español',
    platform: 'Streaming',
    url: 'https://www.vix.com/',
    note: 'Acceso online oficial en México; requiere disponibilidad territorial/cuenta.',
    sourceLabel: 'Ayuda ViX · Pase Mundial 2026',
    sourceUrl: 'https://ayuda.vix.com/hc/es-mx/articles/42684164886541-Pase-Mundial-2026-Todo-lo-que-necesitas-saber',
  },
  {
    id: 'fox-us',
    label: 'FOX Sports / FOX One',
    region: 'Estados Unidos',
    language: 'Inglés',
    platform: 'TV + streaming',
    url: 'https://www.foxsports.com/stories/soccer/2026-world-cup-schedule-all-games-dates-matchups-how-watch/',
    note: 'Calendario oficial de FOX; FOX/FS1 y streaming FOX One/App según suscripción.',
    sourceLabel: 'FOX Sports · schedule/how to watch',
    sourceUrl: 'https://www.foxsports.com/stories/soccer/2026-world-cup-schedule-all-games-dates-matchups-how-watch/',
  },
  {
    id: 'peacock-us',
    label: 'Peacock / Telemundo',
    region: 'Estados Unidos',
    language: 'Español',
    platform: 'Streaming',
    url: 'https://www.peacocktv.com/sports/copa-mundial?cid=2211sptcpmndlpkowneml20009',
    note: 'Streaming en español de los 104 partidos; algunos partidos pueden ser gratis.',
    sourceLabel: 'Peacock · Copa Mundial 2026',
    sourceUrl: 'https://www.peacocktv.com/sports/copa-mundial?cid=2211sptcpmndlpkowneml20009',
  },
];

export function getBroadcastGuide(match: Match | null): BroadcastGuide {
  if (!match) {
    return {
      providers: OFFICIAL_BROADCASTERS,
      priority: 'Normal',
      headline: 'Transmisión oficial',
      note: 'Elige un proveedor autorizado según tu país y cuenta.',
    };
  }

  const score = broadcastImportanceScore(match);
  return {
    providers: OFFICIAL_BROADCASTERS,
    priority: score >= 90 ? 'Alta' : score >= 45 ? 'Media' : 'Normal',
    headline:
      score >= 90
        ? 'Partido prioritario para ver en vivo'
        : score >= 45
          ? 'Transmisión recomendada'
          : 'Transmisión oficial disponible',
    note:
      'La app abre hubs oficiales; si el proveedor exige login, DRM o ubicación, se controla en su plataforma.',
  };
}

export function broadcastImportanceScore(match: Match): number {
  let score = 0;
  if (match.id === 'M001') score += 120;
  if (match.stage.toLowerCase().includes('final')) score += 90;
  if (match.stage.toLowerCase().includes('semi')) score += 75;
  if (match.stage.toLowerCase().includes('quarter') || match.stage.toLowerCase().includes('cuartos')) score += 60;
  if (HOST_TEAMS.has(match.home) || HOST_TEAMS.has(match.away)) score += 50;
  if (MARQUEE_TEAMS.has(match.home)) score += 22;
  if (MARQUEE_TEAMS.has(match.away)) score += 22;
  if (match.matchday === 1) score += 8;
  return score;
}

export function broadcastImportanceLabel(match: Match, teams: Record<string, Team>): string {
  const score = broadcastImportanceScore(match);
  if (match.id === 'M001') return 'Apertura del Mundial';
  if (HOST_TEAMS.has(match.home) || HOST_TEAMS.has(match.away)) {
    const host = HOST_TEAMS.has(match.home) ? match.home : match.away;
    return `${teams[host]?.name ?? host} anfitrión`;
  }
  if (score >= 44) return 'Selección candidata';
  return 'Agenda recomendada';
}

export function featuredBroadcastMatches(matches: Match[], limit = 6): Match[] {
  return [...matches]
    .filter((match) => match.status === 'UPCOMING')
    .sort((a, b) => {
      const scoreDiff = broadcastImportanceScore(b) - broadcastImportanceScore(a);
      if (scoreDiff) return scoreDiff;
      return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    })
    .slice(0, limit);
}
