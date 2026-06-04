/**
 * Unit tests for matchMeta.ts
 *
 * We mock the generated intelPacks module to isolate the logic.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the generated intelPacks module
vi.mock('@/generated/intelPacks', () => ({
  downloadedVenuePhotoExts: {
    'metlife-stadium': 'webp',
  } as Record<string, 'webp'>,
  matchWeather: {
    'm-hot': {
      matchId: 'm-hot',
      city: 'Dallas',
      temperatureMaxC: 35,
      temperatureMinC: 22,
      precipitationMm: 0,
      sourceDate: '2026-06-10',
    },
    'm-rain': {
      matchId: 'm-rain',
      city: 'Miami',
      temperatureMaxC: 30,
      temperatureMinC: 24,
      precipitationMm: 5.2,
      sourceDate: '2026-06-12',
    },
  } as Record<string, { matchId: string; city: string; temperatureMaxC: number; temperatureMinC: number; precipitationMm: number; sourceDate: string }>,
  venueExtras: {
    'MetLife Stadium': {
      id: 'metlife-stadium',
      cityLabel: 'East Rutherford, NJ',
      timezone: 'ET',
      countryCode: 'US',
      wikipedia: '',
      wikidata: null,
      latitude: null,
      longitude: null,
      capacity: 82500,
      source: 'manual',
    },
  } as Record<string, unknown>,
  weatherMeta: {
    source: 'Open-Meteo',
    generatedAt: '2026-06-01',
  },
}));

import {
  sortMatches,
  focusMatch,
  venuePhotoSrc,
  venueTimeLabel,
  weatherSummary,
  h2hSummary,
  matchSourceInfo,
  isMatchLocked,
  lockLabel,
} from '../matchMeta';
import type { Match } from '@worldcup/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'test-1',
    group: 'A',
    stage: 'Group Stage',
    round: 'R1',
    matchday: 1,
    home: 'MEX',
    away: 'ARG',
    homeGoals: null,
    awayGoals: null,
    status: 'UPCOMING',
    minute: null,
    date: '2026-06-15',
    time: '18:00',
    venue: 'MetLife Stadium',
    possH: null,
    shotsH: null,
    shotsA: null,
    shotsTH: null,
    shotsTA: null,
    ...overrides,
  } as Match;
}

// ---------------------------------------------------------------------------
// sortMatches
// ---------------------------------------------------------------------------
describe('sortMatches', () => {
  it('sorts by date and time ascending', () => {
    const matches = [
      makeMatch({ id: 'b', date: '2026-06-16', time: '12:00' }),
      makeMatch({ id: 'a', date: '2026-06-15', time: '18:00' }),
      makeMatch({ id: 'c', date: '2026-06-15', time: '12:00' }),
    ];
    const sorted = sortMatches(matches);
    expect(sorted.map((m) => m.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the original array', () => {
    const matches = [
      makeMatch({ id: 'b', date: '2026-06-16' }),
      makeMatch({ id: 'a', date: '2026-06-15' }),
    ];
    const sorted = sortMatches(matches);
    expect(sorted).not.toBe(matches);
    expect(matches[0].id).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// focusMatch
// ---------------------------------------------------------------------------
describe('focusMatch', () => {
  it('returns LIVE match first', () => {
    const matches = [
      makeMatch({ id: 'up', status: 'UPCOMING', date: '2026-06-15' }),
      makeMatch({ id: 'live', status: 'LIVE', date: '2026-06-14' }),
      makeMatch({ id: 'ft', status: 'FT', date: '2026-06-13' }),
    ];
    expect(focusMatch(matches)!.id).toBe('live');
  });

  it('returns earliest UPCOMING when no LIVE', () => {
    const matches = [
      makeMatch({ id: 'up2', status: 'UPCOMING', date: '2026-06-16' }),
      makeMatch({ id: 'up1', status: 'UPCOMING', date: '2026-06-15' }),
      makeMatch({ id: 'ft', status: 'FT', date: '2026-06-13' }),
    ];
    expect(focusMatch(matches)!.id).toBe('up1');
  });

  it('returns latest FT when no LIVE or UPCOMING', () => {
    const matches = [
      makeMatch({ id: 'ft1', status: 'FT', date: '2026-06-13' }),
      makeMatch({ id: 'ft2', status: 'FT', date: '2026-06-14' }),
    ];
    expect(focusMatch(matches)!.id).toBe('ft2');
  });

  it('returns null for empty array', () => {
    expect(focusMatch([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// venuePhotoSrc
// ---------------------------------------------------------------------------
describe('venuePhotoSrc', () => {
  it('returns path when venue has a photo extension', () => {
    expect(venuePhotoSrc('metlife-stadium')).toBe('/venue-photos/metlife-stadium.webp');
  });

  it('returns null when venue is not in the map', () => {
    expect(venuePhotoSrc('unknown-venue')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(venuePhotoSrc(null)).toBeNull();
    expect(venuePhotoSrc(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// venueTimeLabel
// ---------------------------------------------------------------------------
describe('venueTimeLabel', () => {
  it('includes timezone when venue has extras', () => {
    const match = makeMatch({ venue: 'MetLife Stadium', time: '18:00' });
    expect(venueTimeLabel(match)).toBe('18:00 hora sede · ET');
  });

  it('returns basic label when venue has no extras', () => {
    const match = makeMatch({ venue: 'Unknown Venue', time: '20:00' });
    expect(venueTimeLabel(match)).toBe('20:00 hora sede');
  });
});

// ---------------------------------------------------------------------------
// weatherSummary
// ---------------------------------------------------------------------------
describe('weatherSummary', () => {
  it('returns pending summary for unknown match', () => {
    const w = weatherSummary('unknown-id');
    expect(w.confidence).toBe('Pendiente');
    expect(w.label).toBe('Clima pendiente');
  });

  it('returns temperature for a match with weather data', () => {
    const w = weatherSummary('m-hot');
    expect(w.label).toContain('35');
    expect(w.label).toContain('22');
    expect(w.detail).toContain('Dallas');
    expect(w.confidence).toBe('Media');
  });

  it('includes rain info when precipitation > 0.5mm', () => {
    const w = weatherSummary('m-rain');
    expect(w.detail).toContain('lluvia');
    expect(w.detail).toContain('5.2');
  });

  it('does not include rain when precipitation is 0', () => {
    const w = weatherSummary('m-hot');
    expect(w.detail).not.toContain('lluvia');
  });
});

// ---------------------------------------------------------------------------
// h2hSummary
// ---------------------------------------------------------------------------
describe('h2hSummary', () => {
  it('returns specific H2H for MEX-RSA', () => {
    const h = h2hSummary('MEX', 'RSA');
    expect(h.label).toContain('2010');
    expect(h.confidence).toBe('Media');
  });

  it('returns same result regardless of argument order', () => {
    const a = h2hSummary('MEX', 'RSA');
    const b = h2hSummary('RSA', 'MEX');
    expect(a).toEqual(b);
  });

  it('returns pending for unknown pair', () => {
    const h = h2hSummary('ARG', 'BRA');
    expect(h.confidence).toBe('Pendiente');
    expect(h.label).toContain('pendiente');
  });
});

// ---------------------------------------------------------------------------
// matchSourceInfo
// ---------------------------------------------------------------------------
describe('matchSourceInfo', () => {
  it('returns Alta confidence for FT match', () => {
    const info = matchSourceInfo(makeMatch({ status: 'FT' }));
    expect(info.confidence).toBe('Alta');
    expect(info.label).toContain('final');
  });

  it('returns Media confidence for LIVE match', () => {
    const info = matchSourceInfo(makeMatch({ status: 'LIVE' }));
    expect(info.confidence).toBe('Media');
    expect(info.label).toContain('vivo');
  });

  it('returns Alta confidence for UPCOMING match', () => {
    const info = matchSourceInfo(makeMatch({ status: 'UPCOMING' }));
    expect(info.confidence).toBe('Alta');
    expect(info.label).toContain('Calendario');
  });
});

// ---------------------------------------------------------------------------
// isMatchLocked
// ---------------------------------------------------------------------------
describe('isMatchLocked', () => {
  it('returns true for FT match', () => {
    expect(isMatchLocked(makeMatch({ status: 'FT' }))).toBe(true);
  });

  it('returns true for LIVE match', () => {
    expect(isMatchLocked(makeMatch({ status: 'LIVE' }))).toBe(true);
  });

  it('returns false for UPCOMING match far in the future', () => {
    const futureDate = '2099-12-31';
    expect(isMatchLocked(makeMatch({ status: 'UPCOMING', date: futureDate, time: '18:00' }))).toBe(false);
  });

  it('returns true for UPCOMING match in the past', () => {
    const pastDate = '2020-01-01';
    expect(isMatchLocked(makeMatch({ status: 'UPCOMING', date: pastDate, time: '12:00' }))).toBe(true);
  });

  it('respects leadMinutes parameter', () => {
    // A match 10 minutes from now, expressed in UTC with a venue that has no
    // offset, so the test is deterministic regardless of the runner's timezone.
    const kickoff = new Date(Date.now() + 10 * 60 * 1000);
    const date = kickoff.toISOString().slice(0, 10);
    const time = kickoff.toISOString().slice(11, 16);
    const at = (lead: number) =>
      isMatchLocked(makeMatch({ status: 'UPCOMING', date, time, venue: 'Unknown Venue' }), lead);

    expect(at(0)).toBe(false); // kickoff is still in the future
    expect(at(30)).toBe(true); // already inside the 30-minute lead window
  });
});

// ---------------------------------------------------------------------------
// lockLabel
// ---------------------------------------------------------------------------
describe('lockLabel', () => {
  it('returns "Cerrado · en vivo" for LIVE match', () => {
    expect(lockLabel(makeMatch({ status: 'LIVE' }))).toBe('Cerrado · en vivo');
  });

  it('returns "Cerrado · final" for FT match', () => {
    expect(lockLabel(makeMatch({ status: 'FT' }))).toBe('Cerrado · final');
  });

  it('returns "Cerrado" for UPCOMING match that is already locked', () => {
    expect(lockLabel(makeMatch({ status: 'UPCOMING', date: '2020-01-01', time: '12:00' }))).toBe('Cerrado');
  });

  it('returns time info for UPCOMING match not yet locked', () => {
    const label = lockLabel(makeMatch({ status: 'UPCOMING', date: '2099-12-31', time: '18:00', venue: 'MetLife Stadium' }));
    expect(label).toContain('Cierra al inicio');
    expect(label).toContain('18:00');
  });
});
