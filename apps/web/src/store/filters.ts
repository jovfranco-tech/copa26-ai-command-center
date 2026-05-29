/** Match Center + Players filter state (Zustand). Not persisted by design. */
import { create } from 'zustand';

export interface MatchFilterState {
  status: string;
  group: string;
  team: string;
  stage: string;
  venue: string;
  date: string;
  set: (patch: Partial<Omit<MatchFilterState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const MATCH_DEFAULTS = { status: '', group: '', team: '', stage: '', venue: '', date: '' };

export const useMatchFilters = create<MatchFilterState>((set) => ({
  ...MATCH_DEFAULTS,
  set: (patch) => set(patch),
  reset: () => set({ ...MATCH_DEFAULTS }),
}));

export interface PlayerFilterState {
  q: string;
  team: string;
  pos: string;
  set: (patch: Partial<Omit<PlayerFilterState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const PLAYER_DEFAULTS = { q: '', team: '', pos: '' };

export const usePlayerFilters = create<PlayerFilterState>((set) => ({
  ...PLAYER_DEFAULTS,
  set: (patch) => set(patch),
  reset: () => set({ ...PLAYER_DEFAULTS }),
}));
