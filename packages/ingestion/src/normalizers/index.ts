/**
 * Map raw scraped key/value records into domain objects, then validate with the
 * shared Zod schemas. Whatever fails validation is reported, never written.
 *
 * Field mapping is intentionally generic because it depends on the public page's
 * real DOM (configured via selectors). Adjust here when you wire a real source.
 */
import {
  MatchSchema,
  PlayerSchema,
  TeamSchema,
  VenueSchema,
  type Match,
  type Player,
  type Team,
  type Venue,
} from '@worldcup/shared';
import type { NormalizeResult } from '../lib/scrape-runner.js';

type Raw = Record<string, string>;

function slugId(...parts: string[]): string {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function isoDate(v: string | undefined): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v.slice(0, 10) : d.toISOString().slice(0, 10);
}
function errStr(e: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  return e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

export function normalizeTeams(records: Raw[]): NormalizeResult<Team> {
  const ok: Team[] = [];
  const bad: NormalizeResult<Team>['bad'] = [];
  for (const r of records) {
    const code = (r.code || r.name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const parsed = TeamSchema.safeParse({
      id: code,
      code,
      name: r.name || code,
      group: r.group || '',
      ranking: num(r.ranking),
    });
    if (parsed.success) ok.push(parsed.data);
    else bad.push({ raw: r, error: errStr(parsed.error) });
  }
  return { ok, bad };
}

export function normalizeFixtures(records: Raw[]): NormalizeResult<Match> {
  const ok: Match[] = [];
  const bad: NormalizeResult<Match>['bad'] = [];
  for (const r of records) {
    const home = (r.home || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const away = (r.away || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const date = isoDate(r.date);
    const hs = num(r.homeScore);
    const as = num(r.awayScore);
    const status = hs != null && as != null ? 'FT' : 'UPCOMING';
    const parsed = MatchSchema.safeParse({
      id: slugId(home, away, date) || slugId(r.home, r.away),
      home,
      away,
      date,
      stage: r.stage || 'Group stage',
      group: r.group || '',
      status,
      homeGoals: hs,
      awayGoals: as,
      time: r.time || '',
      venue: r.venue || '',
      minute: num(r.minute),
      possH: num(r.possH ?? r.possessionHome),
      shotsH: num(r.shotsH ?? r.shotsHome),
      shotsA: num(r.shotsA ?? r.shotsAway),
      shotsTH: num(r.shotsTH ?? r.shotsTargetHome),
      shotsTA: num(r.shotsTA ?? r.shotsTargetAway),
    });
    if (parsed.success) ok.push(parsed.data);
    else bad.push({ raw: r, error: errStr(parsed.error) });
  }
  return { ok, bad };
}

export function normalizePlayers(records: Raw[]): NormalizeResult<Player> {
  const ok: Player[] = [];
  const bad: NormalizeResult<Player>['bad'] = [];
  for (const r of records) {
    const team = (r.team || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const pos = (r.position || r.pos || 'MF').toUpperCase().slice(0, 2);
    const parsed = PlayerSchema.safeParse({
      id: r.id || slugId(r.name || 'player', team),
      name: r.name || '',
      team,
      pos,
      club: r.club || '',
      age: num(r.age),
      number: num(r.number ?? r.shirtNumber),
      goals: num(r.goals) ?? 0,
      assists: num(r.assists) ?? 0,
      minutes: num(r.minutes) ?? 0,
      profileUrl: r.profileUrl || null,
    });
    if (parsed.success) ok.push(parsed.data);
    else bad.push({ raw: r, error: errStr(parsed.error) });
  }
  return { ok, bad };
}

export function normalizeVenues(records: Raw[]): NormalizeResult<Venue> {
  const ok: Venue[] = [];
  const bad: NormalizeResult<Venue>['bad'] = [];
  for (const r of records) {
    const parsed = VenueSchema.safeParse({
      id: r.id || slugId(r.city || r.name || 'venue'),
      stadium: r.stadium || r.name || '',
      city: r.city || '',
      country: r.country || '',
      capacity: num(r.capacity),
      surface: r.surface || 'Grass',
    });
    if (parsed.success) ok.push(parsed.data);
    else bad.push({ raw: r, error: errStr(parsed.error) });
  }
  return { ok, bad };
}
