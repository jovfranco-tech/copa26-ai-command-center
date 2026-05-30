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
  importPicks: (picks: Record<string, PoolPick>) => void;
}

export const usePool = create<PoolState>()(
  persist(
    (set) => ({
      playerName: '',
      picks: {},
      setPlayerName: (playerName) => set({ playerName }),
      setOutcome: (matchId, outcome) =>
        set((s) => {
          const pick = s.picks[matchId] ?? {};
          const nextPick = { ...pick, outcome };

          // Clear goals if they conflict with the newly chosen outcome
          if (nextPick.homeGoals != null && nextPick.awayGoals != null) {
            const hasConflict =
              (outcome === 'home' && nextPick.homeGoals <= nextPick.awayGoals) ||
              (outcome === 'away' && nextPick.homeGoals >= nextPick.awayGoals) ||
              (outcome === 'draw' && nextPick.homeGoals !== nextPick.awayGoals);

            if (hasConflict) {
              nextPick.homeGoals = undefined;
              nextPick.awayGoals = undefined;
            }
          }

          return {
            picks: {
              ...s.picks,
              [matchId]: nextPick,
            },
          };
        }),
      setScore: (matchId, side, value) =>
        set((s) => {
          const pick = s.picks[matchId] ?? {};
          const nextPick = { ...pick, [side]: value };

          // Automatically derive outcome if both scores are entered
          if (nextPick.homeGoals != null && nextPick.awayGoals != null) {
            if (nextPick.homeGoals > nextPick.awayGoals) {
              nextPick.outcome = 'home';
            } else if (nextPick.homeGoals < nextPick.awayGoals) {
              nextPick.outcome = 'away';
            } else {
              nextPick.outcome = 'draw';
            }
          }

          return {
            picks: {
              ...s.picks,
              [matchId]: nextPick,
            },
          };
        }),
      clearMatch: (matchId) =>
        set((s) => {
          const picks = { ...s.picks };
          delete picks[matchId];
          return { picks };
        }),
      reset: () => set({ playerName: '', picks: {} }),
      importPicks: (newPicks) =>
        set((s) => ({
          picks: {
            ...s.picks,
            ...newPicks,
          },
        })),
    }),
    { name: 'wc_family_pool' },
  ),
);
