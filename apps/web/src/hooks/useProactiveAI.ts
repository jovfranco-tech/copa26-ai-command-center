import { useEffect, useRef } from 'react';
import { notifyInfo, notifyWarning } from '@/store/notifications';
import type { Match } from '@worldcup/shared';
import type { PoolPick } from '@/store/pool';

interface ProactiveAIOptions {
  matches: Match[];
  picks: Record<string, PoolPick>;
  playerName: string;
  leaderboard: Array<{ playerName: string; points: number }>;
}

/**
 * Fires proactive AI-driven notifications based on tournament state.
 * Runs once per app session (tracks via sessionStorage).
 */
export function useProactiveAI({ matches, picks, playerName, leaderboard }: ProactiveAIOptions) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !matches.length || !playerName) return;
    if (sessionStorage.getItem('wc_proactive_fired')) return;
    firedRef.current = true;
    sessionStorage.setItem('wc_proactive_fired', '1');

    // Delay to not overwhelm on app load
    const timer = setTimeout(() => {
      const upcoming = matches.filter(m => m.status === 'UPCOMING');
      const today = new Date().toISOString().slice(0, 10);
      const todayMatches = upcoming.filter(m => m.date === today);

      // Alert 1: Matches today without picks
      const unpicked = todayMatches.filter(m => !picks[m.id]?.outcome);
      if (unpicked.length > 0) {
        notifyWarning(
          'Picks pendientes hoy',
          `Tienes ${unpicked.length} partido${unpicked.length > 1 ? 's' : ''} hoy sin pronóstico. Cierra tus picks antes del inicio.`,
          { label: 'Ir a Quiniela', href: '/pool' },
        );
      }

      // Alert 2: Opportunity to overtake leader
      if (leaderboard.length >= 2 && playerName) {
        const userIdx = leaderboard.findIndex(r => r.playerName.trim().toLowerCase() === playerName.trim().toLowerCase());
        if (userIdx > 0 && userIdx <= 3) {
          const leader = leaderboard[0];
          const gap = leader.points - (leaderboard[userIdx]?.points ?? 0);
          if (gap <= 6) {
            notifyInfo(
              'Oportunidad táctica',
              `Estás a solo ${gap} pts del puntero (${leader.playerName}). Un par de aciertos exactos te ponen en la cima.`,
              { label: 'Ver quiniela', href: '/pool' },
            );
          }
        }
      }

      // Alert 3: AI insight for next big match
      const nextBig = upcoming.find(m => {
        return !picks[m.id]?.outcome;
      });
      if (nextBig && !unpicked.length) {
        notifyInfo(
          'Próximo partido sin pick',
          `${nextBig.home} vs ${nextBig.away} (${nextBig.date}) aún no tiene pronóstico. Consulta al analista IA para decidir.`,
          { label: 'Analista IA', href: '/analyst' },
        );
      }
    }, 3000); // 3s delay after mount

    return () => clearTimeout(timer);
  }, [matches, picks, playerName, leaderboard]);
}
