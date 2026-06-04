/** TanStack Query hooks over the local API client. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { LiveOverlay, Team, Venue } from '@worldcup/shared';
import {
  assetUrl,
  fetchLiveOverlay,
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
  setLiveOverlay,
  type MatchFilters,
  type PlayerFilters,
} from '@/lib/api';

/** The live overlay (admin-published results/lineups), polled every 60s. */
export function useLiveOverlay() {
  return useQuery<LiveOverlay>({
    queryKey: ['live-overlay'],
    queryFn: fetchLiveOverlay,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/**
 * Mount ONCE near the app root. Primes the api.ts overlay cache and, whenever the
 * published overlay changes, invalidates the derived queries so the table/stats
 * and match views pick up new scores without a redeploy.
 */
export function useLiveOverlaySync() {
  const qc = useQueryClient();
  const { data } = useLiveOverlay();
  const stamp = data?.updatedAt ?? null;
  useEffect(() => {
    if (!data) return;
    setLiveOverlay(data);
    for (const key of ['matches', 'match', 'standings', 'stats']) {
      qc.invalidateQueries({ queryKey: [key] });
    }
    // Re-run only when the published overlay actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);
}

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
