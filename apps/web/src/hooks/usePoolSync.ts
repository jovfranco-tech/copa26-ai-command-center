import { useEffect, useState } from 'react';
import { fetchPoolPicks, normalizePoolGroupId, syncPoolPicks, type LeaderboardEntry } from '@/lib/api';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifySuccess, notifyWarning } from '@/store/notifications';
import type { PoolPick } from '@/store/pool';

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
}

const registerPoolBackgroundSync = async () => {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationWithSync;
  await registration.sync?.register('sync-pool-picks');
};

interface UsePoolSyncOptions {
  playerName: string;
  picks: Record<string, PoolPick>;
  groupId: string;
  avatarUrl: string;
  matches: Array<{ id: string; status: string; home: string; away: string; homeGoals: number | null; awayGoals: number | null }>;
  teams: Record<string, { code: string; ranking?: number | null; name?: string } | undefined>;
  isLoading: boolean;
  onSyncSuccess?: () => void;
}

interface UsePoolSyncReturn {
  syncStatus: 'synced' | 'syncing' | 'error' | null;
  lastSavedAt: string | null;
  leaderboard: LeaderboardEntry[];
  loadingLeaderboard: boolean;
  importedPicks: Record<string, PoolPick> | null;
  importedAvatarUrl: string | null;
}

export function usePoolSync(options: UsePoolSyncOptions): UsePoolSyncReturn {
  const { playerName, picks, groupId, avatarUrl, matches, teams, isLoading, onSyncSuccess } = options;

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [importedPicks, setImportedPicks] = useState<Record<string, PoolPick> | null>(null);
  const [importedAvatarUrl, setImportedAvatarUrl] = useState<string | null>(null);

  // Load existing picks from DB when the participant name changes
  useEffect(() => {
    if (!playerName.trim()) return;

    const loadPicks = async () => {
      try {
        const res = await fetchPoolPicks(playerName, groupId);
        if (res.ok && res.picks && Object.keys(res.picks).length > 0) {
          setImportedPicks(res.picks);
          if (res.avatarUrl) setImportedAvatarUrl(res.avatarUrl);
          setSyncStatus('synced');
        }
      } catch {
        // Failure handled gracefully — no picks loaded
      }
    };
    loadPicks();
  }, [playerName, groupId]);

  // Sync picks to Firestore (debounced to avoid spamming the connection)
  useEffect(() => {
    if (!playerName.trim()) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const ok = await syncPoolPicks(playerName, picks, groupId, avatarUrl);
        if (ok) {
          setSyncStatus('synced');
          setLastSavedAt(new Date().toISOString());
          onSyncSuccess?.();
          notifySuccess('Quiniela guardada', 'Tus picks se sincronizaron en la nube compartida.');
        } else {
          setSyncStatus('error');
          registerPoolBackgroundSync().catch(() => {});
          notifyWarning('Sin conexión', 'La quiniela se guardará automáticamente cuando se restaure la red.');
        }
      } catch {
        setSyncStatus('error');
        registerPoolBackgroundSync().catch(() => {});
        notifyWarning('Sin conexión', 'La quiniela se guardará automáticamente cuando se restaure la red.');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [playerName, picks, groupId, avatarUrl, onSyncSuccess]);

  // Fallback listener for online window event
  useEffect(() => {
    const handleOnline = async () => {
      if (!playerName.trim()) return;
      setSyncStatus('syncing');
      try {
        const ok = await syncPoolPicks(playerName, picks, groupId, avatarUrl);
        if (ok) {
          setSyncStatus('synced');
          setLastSavedAt(new Date().toISOString());
          onSyncSuccess?.();
        } else {
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus('error');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [playerName, picks, groupId, avatarUrl, onSyncSuccess]);

  // Load Leaderboard in real-time from Firestore onSnapshot
  useEffect(() => {
    const matchItems = matches;
    const teamItems = Object.values(teams).filter(Boolean) as Array<{ code: string; ranking?: number; name?: string }>;
    const teamMap = new Map(teamItems.map((t) => [t.code, t]));

    if (isLoading || !matchItems.length) return;

    setLoadingLeaderboard(true);

    const unsubscribe = onSnapshot(
      collection(db, 'poolGroups', normalizePoolGroupId(groupId), 'members'),
      (snapshot) => {
        const board: LeaderboardEntry[] = [];
        const playedMatches = matchItems.filter((m) => m.status === 'FT');

        // 1. Process all participant predictions from Firestore documents
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const name = typeof docData.playerName === 'string' ? docData.playerName : docSnap.id;
          const memberPicks = docData.picks || {};

          let points = 0;
          let exactScores = 0;
          let outcomeHits = 0;
          let predictedPlayedCount = 0;

          for (const m of playedMatches) {
            const pick = memberPicks[m.id];
            if (!pick || !pick.outcome) continue;

            predictedPlayedCount++;
            const realHome = m.homeGoals ?? 0;
            const realAway = m.awayGoals ?? 0;

            let realOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (realHome > realAway) realOutcome = 'home';
            else if (realHome < realAway) realOutcome = 'away';

            const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
            const isOutcomeCorrect = pick.outcome === realOutcome;

            if (isExact) {
              points += 3;
              exactScores++;
            } else if (isOutcomeCorrect) {
              points += 1;
              outcomeHits++;
            }
          }

          const efficiency = predictedPlayedCount > 0
            ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100)
            : 0;

          board.push({
            playerName: name,
            avatarUrl: typeof docData.avatarUrl === 'string' ? docData.avatarUrl : '',
            points,
            exactScores,
            outcomeHits,
            efficiency,
            predictedCount: Object.keys(memberPicks).length,
          });
        });

        // 2. Inject the 3 virtual AI agents to compete in the leaderboard
        const agents: Array<'optimista' | 'stats' | 'contrarian'> = ['optimista', 'stats', 'contrarian'];
        const agentNames = {
          optimista: 'IA · Optimista',
          stats: 'IA · Estadístico',
          contrarian: 'IA · Contrarian',
        };

        for (const agent of agents) {
          let points = 0;
          let exactScores = 0;
          let outcomeHits = 0;
          let predictedPlayedCount = 0;

          for (const m of playedMatches) {
            const homeTeam = teamMap.get(m.home);
            const awayTeam = teamMap.get(m.away);

            const homeRank = homeTeam?.ranking ?? 50;
            const awayRank = awayTeam?.ranking ?? 50;
            const rankDiff = awayRank - homeRank;

            let pred: { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' };
            if (agent === 'optimista') {
              if (rankDiff > 10) pred = { homeGoals: 3, awayGoals: 1, outcome: 'home' };
              else if (rankDiff < -10) pred = { homeGoals: 1, awayGoals: 3, outcome: 'away' };
              else pred = { homeGoals: 2, awayGoals: 2, outcome: 'draw' };
            } else if (agent === 'stats') {
              if (rankDiff > 5) pred = { homeGoals: 1, awayGoals: 0, outcome: 'home' };
              else if (rankDiff < -5) pred = { homeGoals: 0, awayGoals: 1, outcome: 'away' };
              else pred = { homeGoals: 1, awayGoals: 1, outcome: 'draw' };
            } else {
              if (rankDiff > 15) pred = { homeGoals: 1, awayGoals: 2, outcome: 'away' };
              else if (rankDiff < -15) pred = { homeGoals: 2, awayGoals: 1, outcome: 'home' };
              else pred = { homeGoals: 0, awayGoals: 0, outcome: 'draw' };
            }

            predictedPlayedCount++;
            const realHome = m.homeGoals ?? 0;
            const realAway = m.awayGoals ?? 0;

            let realOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (realHome > realAway) realOutcome = 'home';
            else if (realHome < realAway) realOutcome = 'away';

            const isExact = pred.homeGoals === realHome && pred.awayGoals === realAway;
            const isOutcomeCorrect = pred.outcome === realOutcome;

            if (isExact) {
              points += 3;
              exactScores++;
            } else if (isOutcomeCorrect) {
              points += 1;
              outcomeHits++;
            }
          }

          const efficiency = predictedPlayedCount > 0
            ? Math.round(((exactScores + outcomeHits) / predictedPlayedCount) * 100)
            : 0;

          board.push({
            playerName: agentNames[agent],
            points,
            exactScores,
            outcomeHits,
            efficiency,
            predictedCount: playedMatches.length,
          });
        }

        // 3. Sort leaderboard by points, then exact scores, then efficiency
        board.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
          return b.efficiency - a.efficiency;
        });

        setLeaderboard(board);
        setLoadingLeaderboard(false);
      },
      (_error) => {
        setLoadingLeaderboard(false);
      }
    );

    return () => unsubscribe();
  }, [matches, teams, isLoading, groupId]);

  return {
    syncStatus,
    lastSavedAt,
    leaderboard,
    loadingLeaderboard,
    importedPicks,
    importedAvatarUrl,
  };
}
