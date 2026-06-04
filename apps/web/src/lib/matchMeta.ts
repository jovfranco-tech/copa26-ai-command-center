import type { Match } from '@worldcup/shared';
import { downloadedVenuePhotoExts, matchWeather, venueExtras, weatherMeta } from '@/generated/intelPacks';

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

export function venueTimeLabel(match: Match): string {
  const extra = venueExtras[match.venue];
  return extra?.timezone ? `${match.time} hora sede · ${extra.timezone}` : `${match.time} hora sede`;
}

export function weatherSummary(matchId: string): WeatherSummary {
  const w = matchWeather[matchId];
  if (!w || w.temperatureMaxC == null) {
    return {
      label: 'Clima pendiente',
      detail: 'Se completa cuando exista forecast cercano al partido.',
      source: 'Forecast pendiente',
      date: 'Por actualizar',
      confidence: 'Pendiente',
    };
  }

  const rain = w.precipitationMm != null && w.precipitationMm > 0.5 ? ` · lluvia ${w.precipitationMm.toFixed(1)} mm` : '';
  return {
    label: `${Math.round(w.temperatureMaxC)}°C max / ${Math.round(w.temperatureMinC ?? w.temperatureMaxC)}°C min`,
    detail: `${w.city}${rain}`,
    source: weatherMeta.source,
    date: w.sourceDate,
    confidence: 'Media',
  };
}

export function h2hSummary(home: string, away: string): DataSourceInfo {
  const key = [home, away].sort().join('-');
  if (key === 'MEX-RSA') {
    return {
      label: 'H2H destacado: apertura 2010, 1-1',
      source: 'Historial curado local',
      date: '2026-05-31',
      confidence: 'Media',
    };
  }
  return {
    label: 'H2H pendiente de fuente viva',
    source: 'Pipeline preparado',
    date: 'Por actualizar',
    confidence: 'Pendiente',
  };
}

export function matchSourceInfo(match: Match): DataSourceInfo {
  if (match.status === 'FT') {
    return {
      label: 'Marcador final',
      source: 'Resultados del torneo',
      date: match.date,
      confidence: 'Alta',
    };
  }
  if (match.status === 'LIVE') {
    return {
      label: 'Marcador en vivo',
      source: 'Feed de resultados',
      date: match.date,
      confidence: 'Media',
    };
  }
  return {
    label: 'Calendario confirmado',
    source: 'Dataset local del torneo',
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

export function lockLabel(match: Match): string {
  if (match.status === 'LIVE') return 'Cerrado · en vivo';
  if (match.status === 'FT') return 'Cerrado · final';
  return isMatchLocked(match) ? 'Cerrado' : `Cierra al inicio · ${venueTimeLabel(match)}`;
}

