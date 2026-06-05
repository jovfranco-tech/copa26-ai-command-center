import type { Match } from '@worldcup/shared';
import { downloadedVenuePhotoExts, matchWeather, venueExtras, weatherMeta } from '@/generated/intelPacks';
import { tEs, type Translate } from '@/i18n';

export interface WeatherSummary {
  label: string;
  detail: string;
  source: string;
  date: string;
  confidence: 'Alta' | 'Media' | 'Pendiente';
}

export interface DataSourceInfo {
  label: string;
  source: string;
  date: string;
  confidence: 'Alta' | 'Media' | 'Pendiente' | 'Manual';
}

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function focusMatch(matches: Match[]): Match | null {
  const sorted = sortMatches(matches);
  return (
    sorted.find((m) => m.status === 'LIVE') ??
    sorted.find((m) => m.status === 'UPCOMING') ??
    [...sorted].reverse().find((m) => m.status === 'FT') ??
    null
  );
}

export function venuePhotoSrc(venueId: string | null | undefined): string | null {
  if (!venueId) return null;
  const ext = downloadedVenuePhotoExts[venueId];
  return ext ? `/venue-photos/${encodeURIComponent(venueId)}.${ext}` : null;
}

export function venueTimeLabel(match: Match, t: Translate = tEs): string {
  const extra = venueExtras[match.venue];
  return extra?.timezone
    ? t('matchMeta.venueTimeTz', { time: match.time, tz: extra.timezone })
    : t('matchMeta.venueTime', { time: match.time });
}

export function weatherSummary(matchId: string, t: Translate = tEs): WeatherSummary {
  const w = matchWeather[matchId];
  if (!w || w.temperatureMaxC == null) {
    return {
      label: t('matchMeta.weatherPending'),
      detail: t('matchMeta.weatherPendingDetail'),
      source: t('matchMeta.forecastPending'),
      date: t('matchMeta.toUpdate'),
      confidence: 'Pendiente',
    };
  }

  const rain = w.precipitationMm != null && w.precipitationMm > 0.5 ? t('matchMeta.rain', { mm: w.precipitationMm.toFixed(1) }) : '';
  return {
    label: t('matchMeta.weatherLabel', {
      max: Math.round(w.temperatureMaxC),
      min: Math.round(w.temperatureMinC ?? w.temperatureMaxC),
    }),
    detail: `${w.city}${rain}`,
    source: weatherMeta.source,
    date: w.sourceDate,
    confidence: 'Media',
  };
}

export function h2hSummary(home: string, away: string, t: Translate = tEs): DataSourceInfo {
  const key = [home, away].sort().join('-');
  if (key === 'MEX-RSA') {
    return {
      label: t('matchMeta.h2hHighlight'),
      source: t('matchMeta.h2hCuratedSource'),
      date: '2026-05-31',
      confidence: 'Media',
    };
  }
  return {
    label: t('matchMeta.h2hPending'),
    source: t('matchMeta.h2hPipeline'),
    date: t('matchMeta.toUpdate'),
    confidence: 'Pendiente',
  };
}

export function matchSourceInfo(match: Match, t: Translate = tEs): DataSourceInfo {
  if (match.status === 'FT') {
    return {
      label: t('matchMeta.finalScore'),
      source: t('matchMeta.tournamentResults'),
      date: match.date,
      confidence: 'Alta',
    };
  }
  if (match.status === 'LIVE') {
    return {
      label: t('matchMeta.liveScore'),
      source: t('matchMeta.resultsFeed'),
      date: match.date,
      confidence: 'Media',
    };
  }
  return {
    label: t('matchMeta.scheduleConfirmed'),
    source: t('matchMeta.localTournamentDataset'),
    date: '2026-05-31',
    confidence: 'Alta',
  };
}

/**
 * Absolute kickoff instant (ms since epoch).
 *
 * `match.time` is wall-clock "hora sede" with a fixed venue offset (e.g. "UTC-6").
 * We resolve it to a real UTC instant so the lock fires at the same moment for
 * every viewer regardless of their device timezone — and so the client and the
 * edge server agree. Falls back to a consistent UTC reading when no offset.
 */
export function kickoffInstant(match: Match): number {
  const base = Date.parse(`${match.date}T${match.time || '00:00'}:00Z`); // wall-clock read as UTC
  if (!Number.isFinite(base)) return NaN;
  const offsetMatch = /^UTC([+-]\d{1,2})(?::?(\d{2}))?$/.exec(venueExtras[match.venue]?.timezone ?? '');
  if (!offsetMatch) return base; // unknown/abbreviated offset → consistent UTC interpretation
  const hours = parseInt(offsetMatch[1]!, 10);
  const minutes = offsetMatch[2] ? parseInt(offsetMatch[2], 10) : 0;
  const offsetMin = hours * 60 + (hours < 0 ? -minutes : minutes);
  return base - offsetMin * 60_000; // shift the venue wall-clock onto the true UTC timeline
}

export function isMatchLocked(match: Match, leadMinutes = 0): boolean {
  if (match.status !== 'UPCOMING') return true;
  const kickoff = kickoffInstant(match);
  if (!Number.isFinite(kickoff)) return false;
  return Date.now() >= kickoff - leadMinutes * 60 * 1000;
}

export function lockLabel(match: Match, t: Translate = tEs): string {
  if (match.status === 'LIVE') return t('matchMeta.lockedLive');
  if (match.status === 'FT') return t('matchMeta.lockedFinal');
  return isMatchLocked(match) ? t('matchMeta.locked') : t('matchMeta.closesAtStart', { time: venueTimeLabel(match, t) });
}

