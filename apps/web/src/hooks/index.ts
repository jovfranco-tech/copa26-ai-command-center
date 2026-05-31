/** TanStack Query hooks over the local API client. */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Team, Venue } from '@worldcup/shared';
import {
  assetUrl,
  fetchMatch,
  fetchMatches,
  fetchPlayer,
  fetchPlayers,
  fetchStandings,
  fetchStats,
  fetchSyncStatus,
  fetchTeam,
  fetchTeams,
  fetchVenues,
  type MatchFilters,
  type PlayerFilters,
} from '@/lib/api';

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: fetchTeams });
}

export function useTeam(id: string) {
  return useQuery({ queryKey: ['team', id], queryFn: () => fetchTeam(id), enabled: !!id });
}

/** Convenience: a code -> Team lookup map (used for crests/flags everywhere). */
export function useTeamsMap(): Record<string, Team> {
  const { data } = useTeams();
  return useMemo(() => {
    const map: Record<string, Team> = {};
    for (const t of data?.items ?? []) map[t.code] = t;
    return map;
  }, [data]);
}

export function usePlayers(filters: PlayerFilters = {}) {
  return useQuery({
    queryKey: ['players', filters],
    queryFn: () => fetchPlayers(filters),
  });
}

export function usePlayer(id: string) {
  return useQuery({ queryKey: ['player', id], queryFn: () => fetchPlayer(id), enabled: !!id });
}

export function useMatches(filters: MatchFilters = {}) {
  return useQuery({
    queryKey: ['matches', filters],
    queryFn: () => fetchMatches(filters),
  });
}

export function useMatch(id: string) {
  return useQuery({ queryKey: ['match', id], queryFn: () => fetchMatch(id), enabled: !!id });
}

export function useVenues() {
  return useQuery({ queryKey: ['venues'], queryFn: fetchVenues });
}

export function useVenuesMap(): Record<string, Venue> {
  const { data } = useVenues();
  return useMemo(() => {
    const map: Record<string, Venue> = {};
    for (const v of data?.items ?? []) map[v.id] = v;
    return map;
  }, [data]);
}

export function useStandings() {
  return useQuery({ queryKey: ['standings'], queryFn: fetchStandings });
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: fetchStats });
}

export function useSyncStatus() {
  return useQuery({ queryKey: ['sync'], queryFn: fetchSyncStatus });
}

/** Resolve a local asset id to its same-origin URL (null -> render placeholder). */
export function useAsset(assetId: string | null | undefined): string | null {
  return assetUrl(assetId);
}

export { useHolographicTilt } from './useHolographicTilt';
