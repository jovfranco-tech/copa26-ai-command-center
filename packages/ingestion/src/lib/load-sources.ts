/** Pick the dataset to validate/report on: normalized scrape cache, else mock. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mock, type Match, type Player, type Team, type Venue } from '@worldcup/shared';
import { CACHE_DIR } from './cache.js';

function readNormalized<T>(kind: string): T[] {
  const p = join(CACHE_DIR, 'json', `${kind}.normalized.json`);
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T[];
  } catch {
    return [];
  }
}

export interface Sources {
  source: 'cache' | 'mock';
  teams: Team[];
  matches: Match[];
  players: Player[];
  venues: Venue[];
}

export function loadSources(): Sources {
  const teams = readNormalized<Team>('teams');
  const matches = [...readNormalized<Match>('fixtures'), ...readNormalized<Match>('matchStats')];
  const players = [...readNormalized<Player>('players'), ...readNormalized<Player>('playerProfiles')];
  const venues = readNormalized<Venue>('venues');

  if (!teams.length && !matches.length && !players.length && !venues.length) {
    return {
      source: 'mock',
      teams: mock.TEAMS,
      matches: mock.MATCHES,
      players: mock.PLAYERS,
      venues: mock.VENUES,
    };
  }
  return { source: 'cache', teams, matches, players, venues };
}
