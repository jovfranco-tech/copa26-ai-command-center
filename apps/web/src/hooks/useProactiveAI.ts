import { useEffect, useRef } from 'react';
import { notifyInfo, notifyWarning } from '@/store/notifications';
import { translate } from '@/i18n';
import { usePreferences } from '@/store/preferences';
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
      const lang = usePreferences.getState().lang;
      const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
      const upcoming = matches.filter(m => m.status === 'UPCOMING');
      const today = new Date().toISOString().slice(0, 10);
      const todayMatches = upcoming.filter(m => m.date === today);

      // Alert 1: Matches today without picks
      const unpicked = todayMatches.filter(m => !picks[m.id]?.outcome);
      if (unpicked.length > 0) {
        notifyWarning(
          t('proactive.picksPendingTitle'),
          t('proactive.picksPendingText', { n: unpicked.length, m: unpicked.length > 1 ? t('proactive.matchesWord') : t('proactive.matchWord') }),
          { label: t('proactive.goPool'), href: '/pool' },
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
              t('proactive.opportunityTitle'),
              t('proactive.opportunityText', { gap, leader: leader.playerName }),
              { label: t('proactive.viewPool'), href: '/pool' },
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
          t('proactive.nextNoPickTitle'),
          t('proactive.nextNoPickText', { home: nextBig.home, away: nextBig.away, date: nextBig.date }),
          { label: t('aiAnalyst.aiAnalyst'), href: '/analyst' },
        );
      }
    }, 3000); // 3s delay after mount

    return () => clearTimeout(timer);
  }, [matches, picks, playerName, leaderboard]);
}
