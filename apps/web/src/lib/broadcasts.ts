import type { Match, Team } from '@worldcup/shared';
import { tEs, type Translate } from '@/i18n';

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

/** Static provider data with i18n keys for the human-readable fields. */
const BROADCASTER_SEED: Array<Omit<BroadcastProvider, 'region' | 'language' | 'note'> & {
  regionKey: string;
  languageKey: string;
  noteKey: string;
}> = [
  {
    id: 'vix-mx',
    label: 'ViX Pase Mundial',
    regionKey: 'broadcasts.regionMx',
    languageKey: 'lang.es',
    platform: 'Streaming',
    url: 'https://www.vix.com/',
    noteKey: 'broadcasts.noteVix',
    sourceLabel: 'Ayuda ViX · Pase Mundial 2026',
    sourceUrl: 'https://ayuda.vix.com/hc/es-mx/articles/42684164886541-Pase-Mundial-2026-Todo-lo-que-necesitas-saber',
  },
  {
    id: 'fox-us',
    label: 'FOX Sports / FOX One',
    regionKey: 'broadcasts.regionUs',
    languageKey: 'lang.en',
    platform: 'TV + streaming',
    url: 'https://www.foxsports.com/stories/soccer/2026-world-cup-schedule-all-games-dates-matchups-how-watch/',
    noteKey: 'broadcasts.noteFox',
    sourceLabel: 'FOX Sports · schedule/how to watch',
    sourceUrl: 'https://www.foxsports.com/stories/soccer/2026-world-cup-schedule-all-games-dates-matchups-how-watch/',
  },
  {
    id: 'peacock-us',
    label: 'Peacock / Telemundo',
    regionKey: 'broadcasts.regionUs',
    languageKey: 'lang.es',
    platform: 'Streaming',
    url: 'https://www.peacocktv.com/sports/copa-mundial?cid=2211sptcpmndlpkowneml20009',
    noteKey: 'broadcasts.notePeacock',
    sourceLabel: 'Peacock · Copa Mundial 2026',
    sourceUrl: 'https://www.peacocktv.com/sports/copa-mundial?cid=2211sptcpmndlpkowneml20009',
  },
];

export function getBroadcasters(t: Translate = tEs): BroadcastProvider[] {
  return BROADCASTER_SEED.map(({ regionKey, languageKey, noteKey, ...rest }) => ({
    ...rest,
    region: t(regionKey),
    language: t(languageKey),
    note: t(noteKey),
  }));
}

export function getBroadcastGuide(match: Match | null, t: Translate = tEs): BroadcastGuide {
  if (!match) {
    return {
      providers: getBroadcasters(t),
      priority: 'Normal',
      headline: t('broadcasts.official'),
      note: t('broadcasts.chooseProvider'),
    };
  }

  const score = broadcastImportanceScore(match);
  return {
    providers: getBroadcasters(t),
    priority: score >= 90 ? 'Alta' : score >= 45 ? 'Media' : 'Normal',
    headline:
      score >= 90
        ? t('broadcasts.priorityMatch')
        : score >= 45
          ? t('broadcasts.recommended')
          : t('broadcasts.officialAvailable'),
    note: t('broadcasts.guideNote'),
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

export function broadcastImportanceLabel(match: Match, teams: Record<string, Team>, t: Translate = tEs): string {
  const score = broadcastImportanceScore(match);
  if (match.id === 'M001') return t('broadcasts.worldCupOpener');
  if (HOST_TEAMS.has(match.home) || HOST_TEAMS.has(match.away)) {
    const host = HOST_TEAMS.has(match.home) ? match.home : match.away;
    return t('broadcasts.host', { name: teams[host]?.name ?? host });
  }
  if (score >= 44) return t('broadcasts.candidate');
  return t('broadcasts.recommendedAgenda');
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
