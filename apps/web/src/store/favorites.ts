/** Favorites (teams / players / matches) + personal notes. Persisted locally. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FavKind = 'teams' | 'players' | 'matches';

interface FavoritesState {
  teams: string[];
  players: string[];
  matches: string[];
  notes: string;
  toggle: (kind: FavKind, id: string) => void;
  isFav: (kind: FavKind, id: string) => boolean;
  setNotes: (v: string) => void;
  clear: (kind: FavKind) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      teams: [],
      players: [],
      matches: [],
      notes: '',
      toggle: (kind, id) =>
        set((s) => {
          const arr = s[kind];
          return {
            [kind]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
          } as Partial<FavoritesState>;
        }),
      isFav: (kind, id) => get()[kind].includes(id),
      setNotes: (v) => set({ notes: v }),
      clear: (kind) => set({ [kind]: [] } as Partial<FavoritesState>),
    }),
    { name: 'wc_favs' },
  ),
);
