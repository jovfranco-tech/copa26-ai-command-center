/** Family pool picks. Client-side only, persisted per browser. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PoolOutcome = 'home' | 'draw' | 'away';

export interface PoolPick {
  outcome?: PoolOutcome;
  homeGoals?: number;
  awayGoals?: number;
}

interface PoolState {
  playerName: string;
  picks: Record<string, PoolPick>;
  setPlayerName: (name: string) => void;
  setOutcome: (matchId: string, outcome: PoolOutcome) => void;
  setScore: (matchId: string, side: 'homeGoals' | 'awayGoals', value: number | undefined) => void;
  clearMatch: (matchId: string) => void;
  reset: () => void;
}

export const usePool = create<PoolState>()(
  persist(
    (set) => ({
      playerName: '',
      picks: {},
      setPlayerName: (playerName) => set({ playerName }),
      setOutcome: (matchId, outcome) =>
        set((s) => ({
          picks: {
            ...s.picks,
            [matchId]: { ...(s.picks[matchId] ?? {}), outcome },
          },
        })),
      setScore: (matchId, side, value) =>
        set((s) => ({
          picks: {
            ...s.picks,
            [matchId]: { ...(s.picks[matchId] ?? {}), [side]: value },
          },
        })),
      clearMatch: (matchId) =>
        set((s) => {
          const picks = { ...s.picks };
          delete picks[matchId];
          return { picks };
        }),
      reset: () => set({ playerName: '', picks: {} }),
    }),
    { name: 'wc_family_pool' },
  ),
);
