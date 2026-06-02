/** Favorites (teams / players / matches) + personal notes. Persisted locally. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FavKind = 'teams' | 'players' | 'matches';

export interface TacticalNote {
  id: string;
  query: string;
  response: string;
  chart?: {
    type: 'bar' | 'line';
    title: string;
    keys: string[];
    data: Array<{ name: string; [key: string]: number | string }>;
  } | null;
  timestamp: string;
}

interface FavoritesState {
  teams: string[];
  players: string[];
  matches: string[];
  notes: string;
  tacticalNotes?: TacticalNote[];
  toggle: (kind: FavKind, id: string) => void;
  isFav: (kind: FavKind, id: string) => boolean;
  setNotes: (v: string) => void;
  addTacticalNote: (note: Omit<TacticalNote, 'id' | 'timestamp'>) => void;
  removeTacticalNote: (id: string) => void;
  clear: (kind: FavKind) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      teams: [],
      players: [],
      matches: [],
      notes: '',
      tacticalNotes: [],
      toggle: (kind, id) =>
        set((s) => {
          const arr = s[kind];
          return {
            [kind]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
          } as Partial<FavoritesState>;
        }),
      isFav: (kind, id) => get()[kind].includes(id),
      setNotes: (v) => set({ notes: v }),
      addTacticalNote: (note) =>
        set((s) => ({
          tacticalNotes: [
            ...(s.tacticalNotes ?? []),
            {
              ...note,
              id: `note-${Date.now()}`,
              timestamp: new Date().toLocaleDateString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ],
        })),
      removeTacticalNote: (id) =>
        set((s) => ({
          tacticalNotes: (s.tacticalNotes ?? []).filter((n) => n.id !== id),
        })),
      clear: (kind) => set({ [kind]: [] } as Partial<FavoritesState>),
    }),
    { name: 'wc_favs' },
  ),
);
