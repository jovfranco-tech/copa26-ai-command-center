import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import { usePoolSync } from '@/hooks/usePoolSync';
import { useProactiveAI } from '@/hooks/useProactiveAI';
import { usePool, type PoolOutcome, type PoolPick } from '@/store/pool';
import { usePreferences } from '@/store/preferences';
import { useT, type Translate } from '@/i18n';
import { askPoolAgent } from '@/lib/aiClient';
import { normalizePoolGroupId, type LeaderboardEntry } from '@/lib/api';
import { isMatchLocked, lockLabel, weatherSummary } from '@/lib/matchMeta';
import { buildPoolDiagnostics } from '@/lib/opsIntelligence';
import { shareTextCard } from '@/lib/shareCards';
import { getBrowserAudioContext } from '@/lib/audioSynth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifySuccess, notifyInfo, notifyWarning } from '@/store/notifications';
import { QuinielaScanner } from '@/components/QuinielaScanner';
import { P2PSyncPanel } from '@/components/P2PSyncPanel';
import { RetoRelampago } from '@/components/RetoRelampago';
import {
  PoolMatch,
  FamilySetupGuide,
  FamilyInviteKit,
  PoolCommandCenter,
  FamilyLearningPanel,
  SummaryTile,
  PickHistoryPanel,
} from '@/components/pool';

const playTick = () => {
  try {
    const ctx = getBrowserAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // AudioContext blocked
  }
};

const playSuccessTick = () => {
  try {
    const ctx = getBrowserAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // AudioContext blocked
  }
};

const AI_AGENT_PREFIX = 'IA ·';

interface PoolAlert {
  icon: IconName;
  title: string;
  text: string;
  tone: 'ok' | 'warn' | 'info';
}

interface PoolAward {
  icon: IconName;
  title: string;
  text: string;
  active: boolean;
}

function outcomeText(outcome: PoolOutcome | undefined, t: Translate): string {
  if (outcome === 'home') return t('matchdayHero.winHome');
  if (outcome === 'away') return t('matchdayHero.winAway');
  if (outcome === 'draw') return t('matchdayHero.draw');
  return t('pool.noWinner');
}

function pickScoreText(pick: PoolPick | undefined, t: Translate): string {
  if (pick?.homeGoals != null && pick.awayGoals != null) return `${pick.homeGoals}-${pick.awayGoals}`;
  return outcomeText(pick?.outcome, t);
}

function timeToKickoff(match: Match, t: Translate): string {
  const kickoff = Date.parse(`${match.date}T${match.time || '00:00'}:00`);
  if (!Number.isFinite(kickoff)) return t('pool.timeTBC');
  const diff = kickoff - Date.now();
  if (diff <= 0) return t('matchdayHero.aboutToStart');
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function buildPoolAlerts({
  upcomingMatches,
  picks,
  teams,
  syncStatus,
  t,
}: {
  upcomingMatches: Match[];
  picks: Record<string, PoolPick>;
  teams: Record<string, { name?: string } | undefined>;
  syncStatus: 'synced' | 'syncing' | 'error' | null;
  t: Translate;
}): PoolAlert[] {
  const nextOpen = upcomingMatches.find((match) => !isMatchLocked(match));
  const firstMissing = upcomingMatches.find((match) => !picks[match.id]?.outcome);
  const firstMissingScore = upcomingMatches.find((match) => {
    const pick = picks[match.id];
    return pick?.outcome && (pick.homeGoals == null || pick.awayGoals == null);
  });
  const alerts: PoolAlert[] = [];

  if (nextOpen) {
    alerts.push({
      icon: 'clock',
      title: t('pool.alertNextClose'),
      text: t('pool.alertNextCloseText', { home: teams[nextOpen.home]?.name ?? nextOpen.home, away: teams[nextOpen.away]?.name ?? nextOpen.away, time: timeToKickoff(nextOpen, t) }),
      tone: firstMissing?.id === nextOpen.id ? 'warn' : 'info',
    });
  }

  if (firstMissing) {
    alerts.push({
      icon: 'target',
      title: t('pool.alertPickPending'),
      text: t('pool.alertPickPendingText', { home: teams[firstMissing.home]?.name ?? firstMissing.home, away: teams[firstMissing.away]?.name ?? firstMissing.away }),
      tone: 'warn',
    });
  } else if (upcomingMatches.length) {
    alerts.push({
      icon: 'check',
      title: t('pool.alertWinnersComplete'),
      text: t('pool.alertWinnersCompleteText'),
      tone: 'ok',
    });
  }

  if (firstMissingScore) {
    alerts.push({
      icon: 'activity',
      title: t('pool.alertScorePending'),
      text: t('pool.alertScorePendingText', { home: teams[firstMissingScore.home]?.name ?? firstMissingScore.home, away: teams[firstMissingScore.away]?.name ?? firstMissingScore.away }),
      tone: 'warn',
    });
  }

  if (nextOpen) {
    const weather = weatherSummary(nextOpen.id, t);
    alerts.push({
      icon: 'rain',
      title: t('pool.alertWeather'),
      text: `${weather.label}. ${weather.confidence === 'Pendiente' ? t('pool.alertWeatherUpdate') : weather.detail}`,
      tone: weather.confidence === 'Pendiente' ? 'warn' : 'info',
    });
  }

  alerts.push({
    icon: syncStatus === 'error' ? 'close' : syncStatus === 'syncing' ? 'cloud' : 'shield',
    title: t('pool.alertCloud'),
    text: syncStatus === 'synced' ? t('pool.cloudSynced') : syncStatus === 'syncing' ? t('pool.cloudSyncing') : syncStatus === 'error' ? t('pool.cloudError') : t('pool.cloudIdle'),
    tone: syncStatus === 'error' ? 'warn' : syncStatus === 'synced' ? 'ok' : 'info',
  });

  return alerts.slice(0, 4);
}

function buildPoolAwards({
  stats,
  pickedPending,
  totalPending,
  leaderboard,
  playerName,
  t,
}: {
  stats: { exactScores: number; efficiency: number; totalPoints: number };
  pickedPending: number;
  totalPending: number;
  leaderboard: LeaderboardEntry[];
  playerName: string;
  t: Translate;
}): PoolAward[] {
  const currentRank = leaderboard.findIndex((row) => row.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()) + 1;
  return [
    {
      icon: 'check',
      title: t('pool.awardConsistency'),
      text: totalPending ? t('pool.awardConsistencyText', { picked: pickedPending, total: totalPending }) : t('pool.awardReadyForResults'),
      active: totalPending > 0 && pickedPending === totalPending,
    },
    {
      icon: 'target',
      title: t('pool.awardFineScore'),
      text: t('pool.awardFineScoreText', { n: stats.exactScores }),
      active: stats.exactScores > 0,
    },
    {
      icon: 'trophy',
      title: t('pool.awardGroupLeader'),
      text: currentRank > 0 ? t('pool.awardGroupLeaderText', { rank: currentRank, points: stats.totalPoints }) : t('pool.awardAppearsOnSync'),
      active: currentRank === 1,
    },
    {
      icon: 'activity',
      title: t('pool.awardEfficiency'),
      text: t('pool.awardEfficiencyText', { n: stats.efficiency }),
      active: stats.efficiency >= 50,
    },
  ];
}

export function Pool() {
  const t = useT();
  const { data, isLoading } = useMatches();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const pool = usePool();
  const role = usePreferences((s) => s.role);
  const [view, setView] = useState<'next' | 'all'>('next');
  const [activeTab, setActiveTab] = useState<'predict' | 'results'>('predict');
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    const invitedGroup = new URLSearchParams(window.location.search).get('group');
    if (invitedGroup) pool.setGroupId(normalizePoolGroupId(invitedGroup));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort and separate matches
  const { upcomingMatches, playedMatches } = useMemo(() => {
    const items = data?.items ?? [];
    const sorted = [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    return {
      upcomingMatches: sorted.filter((m) => m.status === 'UPCOMING'),
      playedMatches: sorted.filter((m) => m.status === 'FT' || m.status === 'LIVE'),
    };
  }, [data]);

  const [activeAgent, setActiveAgent] = useState<'optimista' | 'stats' | 'contrarian' | null>(null);
  const [agentBrief, setAgentBrief] = useState<string | null>(null);
  const [agentMeta, setAgentMeta] = useState<{
    confidence?: string;
    dataUsed?: string[];
    ignoredData?: string[];
    warning?: string;
  } | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const summonAgent = async (agentName: 'optimista' | 'stats' | 'contrarian') => {
    if (loadingAgent) return;
    if (role === 'guest') {
      setAgentError(t('pool.guestAgents'));
      setAgentMeta(null);
      return;
    }
    setLoadingAgent(true);
    setAgentError(null);
    setAgentMeta(null);

    const matchesToPredict = upcomingMatches.map((m) => ({
      id: m.id,
      home: m.home,
      away: m.away,
      homeName: teams[m.home]?.name ?? m.home,
      awayName: teams[m.away]?.name ?? m.away,
      date: m.date,
      time: m.time,
      stage: m.stage,
      venueName: venues[m.venue] ? `${venues[m.venue]?.stadium}, ${venues[m.venue]?.city}` : m.venue,
      weatherLabel: weatherSummary(m.id, t).label,
      weatherConfidence: weatherSummary(m.id, t).confidence,
      dataConfidence: t('pool.localCalendarConfirmed'),
    }));

    try {
      const res = await askPoolAgent(agentName, matchesToPredict);
      if (res.ok && res.predictions) {
        pool.importPicks(res.predictions);
        setActiveAgent(agentName);
        setAgentBrief(res.brief ?? null);
        setAgentMeta(res.meta ?? {
          confidence: t('sourceBadge.medium'),
          dataUsed: [t('pool.dataCalendar'), t('pool.dataTeams')],
          ignoredData: [t('pool.dataExternalNews'), t('pool.dataInjuries'), t('pool.dataLineups')],
          warning: t('pool.metaWarningDefault'),
        });
      } else {
        setAgentError(
          res.reason === 'no-key'
            ? t('pool.agentNoKey')
            : t('pool.agentConnError'),
        );
        setAgentMeta(null);
      }
    } catch {
      setAgentError(t('pool.agentNetError'));
    } finally {
      setLoadingAgent(false);
    }
  };

  const onSyncSuccess = useCallback(() => {
    playSuccessTick();
  }, []);

  const { syncStatus, lastSavedAt, leaderboard, loadingLeaderboard, importedPicks, importedAvatarUrl } = usePoolSync({
    playerName: pool.playerName,
    picks: pool.picks,
    groupId: pool.groupId,
    avatarUrl: pool.avatarUrl,
    matches: (data?.items ?? []).map((m) => ({ id: m.id, status: m.status, home: m.home, away: m.away, homeGoals: m.homeGoals ?? null, awayGoals: m.awayGoals ?? null })),
    teams,
    isLoading,
    onSyncSuccess,
  });

  // Apply imported picks from the hook
  useEffect(() => {
    if (importedPicks && Object.keys(importedPicks).length > 0) {
      pool.importPicks(importedPicks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedPicks]);

  useEffect(() => {
    if (importedAvatarUrl && !pool.avatarUrl) {
      pool.setAvatarUrl(importedAvatarUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedAvatarUrl]);

  const [showScanner, setShowScanner] = useState(false);

  const shareLeaderboardLogro = async () => {
    const userRow = leaderboard.find((row) => row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase());
    if (!userRow) {
      notifyWarning(t('pool.nameRequired'), t('pool.nameRequiredText'));
      return;
    }

    const rankIndex = leaderboard.findIndex((row) => row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase());
    const rankNum = rankIndex + 1;
    const medal = rankNum <= 3 ? `Top ${rankNum}` : '';

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw premium glassmorphic background with gold border
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, '#0f0f0f');
    gradient.addColorStop(0.5, '#1e1a12');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = '#c9a24b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 380);

    ctx.strokeStyle = 'rgba(201, 162, 75, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, 570, 370);

    ctx.fillStyle = '#c9a24b';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t('pool.canvasTitle'), 300, 50);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText(t('pool.canvasSubtitle'), 300, 70);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(50, 100, 500, 200, 15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${userRow.playerName}`, 300, 145);

    ctx.fillStyle = '#c9a24b';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(t('pool.canvasPlace', { medal, rank: rankNum, suffix: medal ? '' : 'º' }), 300, 185);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px monospace';
    ctx.fillText(t('pool.canvasPoints'), 150, 230);
    ctx.fillText(t('pool.canvasEfficiency'), 300, 230);
    ctx.fillText(t('pool.canvasExact'), 450, 230);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${userRow.points}`, 150, 270);
    ctx.fillText(`${userRow.efficiency}%`, 300, 270);
    ctx.fillText(`${userRow.exactScores}`, 450, 270);

    ctx.fillStyle = 'rgba(201, 162, 75, 0.6)';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(t('pool.canvasChallenge'), 300, 340);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px sans-serif';
    ctx.fillText(t('pool.canvasBrand'), 300, 365);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'Quiniela_Gala_Logro.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: t('pool.shareAchTitle'),
            text: t('pool.shareAchText', { rank: rankNum, points: userRow.points }),
          });
          if ('vibrate' in navigator) navigator.vibrate([15]);
        } catch (err) {
          // Share canceled or user dismissed — no action needed
          void err;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Quiniela_Logro_${userRow.playerName}.png`;
        a.click();
        URL.revokeObjectURL(url);
        if ('vibrate' in navigator) navigator.vibrate([15]);
        notifySuccess(t('pool.downloadComplete'), t('pool.downloadCompleteText'));
      }
    }, 'image/png');
  };

  const handleP2PSyncComplete = async (peerName: string, peerPicks: Record<string, PoolPick>) => {
    try {
      const docRef = doc(db, 'poolGroups', normalizePoolGroupId(pool.groupId), 'members', peerName);
      await setDoc(docRef, {
        picks: peerPicks,
        playerName: peerName,
        avatarUrl: '',
        updatedAt: new Date().toISOString(),
      });
      playSuccessTick();
    } catch {
      // Error already handled by UI state
    }
  };

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('wc_theme') as 'dark' | 'light') ?? 'dark';
  });

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'light') {
      el.classList.add('light-theme');
    } else {
      el.classList.remove('light-theme');
    }
    localStorage.setItem('wc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    playTick(); // Play organic low-latency tick on theme click
    if ('vibrate' in navigator) navigator.vibrate(12);
  };

  const [accent, setAccent] = useState<'gold' | 'emerald' | 'crimson'>(() => {
    return (localStorage.getItem('wc_accent') as 'gold' | 'emerald' | 'crimson') ?? 'gold';
  });

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('accent-emerald', 'accent-crimson');
    if (accent === 'emerald') el.classList.add('accent-emerald');
    if (accent === 'crimson') el.classList.add('accent-crimson');
    localStorage.setItem('wc_accent', accent);
  }, [accent]);

  const changeAccent = (acc: 'gold' | 'emerald' | 'crimson') => {
    setAccent(acc);
    playTick(); // Play click chime on accent change
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += t('pool.csvHeader') + '\n';

    const items = data?.items ?? [];
    for (const m of items) {
      const pick = pool.picks[m.id];
      const homePredict = pick?.homeGoals ?? '';
      const awayPredict = pick?.awayGoals ?? '';
      const realScore = m.status === 'FT' ? `${m.homeGoals}-${m.awayGoals}` : '';
      csvContent += `"${teams[m.home]?.name ?? m.home} vs ${teams[m.away]?.name ?? m.away}","${m.date}",${homePredict},${awayPredict},"${realScore}",${m.status}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quiniela_${pool.playerName || 'quiniela'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyInviteLink = async () => {
    const group = normalizePoolGroupId(pool.groupId);
    const url = `${window.location.origin}/pool?group=${encodeURIComponent(group)}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      window.prompt(t('pool.copyInvitePrompt'), url);
    }
  };

  const shareFamilyTable = async () => {
    if (!leaderboard.length) {
      notifyInfo(t('pool.noTable'), t('pool.noTableText'));
      return;
    }
    await shareTextCard({
      title: t('pool.tableTitle'),
      subtitle: t('pool.groupSubtitle', { g: normalizePoolGroupId(pool.groupId) }),
      lines: leaderboard.slice(0, 6).map((row, index) =>
        t('pool.tableLine', { place: index + 1, name: row.playerName, points: row.points, exact: row.exactScores, eff: row.efficiency }),
      ),
      footer: t('pool.footerPool2026'),
      fileName: `tabla-${normalizePoolGroupId(pool.groupId)}.png`,
    });
  };

  const shareInviteCard = async () => {
    const group = normalizePoolGroupId(pool.groupId);
    const url = `${window.location.origin}/pool?group=${encodeURIComponent(group)}`;
    await shareTextCard({
      title: t('pool.joinTitle'),
      subtitle: t('pool.groupSubtitle', { g: group }),
      lines: [
        t('pool.joinStep1'),
        t('pool.joinStep2'),
        t('pool.joinStep3'),
        url,
      ],
      footer: t('teamDetail.worldcup2026'),
      fileName: `invitacion-${group}.png`,
    });
  };

  // Statistics calculations for played matches
  const stats = useMemo(() => {
    let totalPoints = 0;
    let exactScores = 0;
    let outcomeHits = 0;
    let playedWithPrediction = 0;

    for (const m of playedMatches) {
      const pick = pool.picks[m.id];
      if (!pick || !pick.outcome) continue;

      playedWithPrediction++;
      const realHome = m.homeGoals ?? 0;
      const realAway = m.awayGoals ?? 0;

      let realOutcome: 'home' | 'draw' | 'away' = 'draw';
      if (realHome > realAway) realOutcome = 'home';
      else if (realHome < realAway) realOutcome = 'away';

      const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
      const isOutcomeCorrect = pick.outcome === realOutcome;

      if (isExact) {
        totalPoints += 3;
        exactScores++;
      } else if (isOutcomeCorrect) {
        totalPoints += 1;
        outcomeHits++;
      }
    }

    const efficiency = playedWithPrediction > 0
      ? Math.round(((exactScores + outcomeHits) / playedWithPrediction) * 100)
      : 0;

    return {
      totalPoints,
      exactScores,
      outcomeHits,
      efficiency,
      playedWithPrediction,
    };
  }, [playedMatches, pool.picks]);

  // Compute live AI Trend Alerts based on the Leaderboard
  const trendAlert = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) {
      return t('pool.trendNoData');
    }

    const leader = leaderboard[0];
    const userRow = leaderboard.find(
      (row) => row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase()
    );
    const aiRows = leaderboard.filter((row) => row.playerName.startsWith(AI_AGENT_PREFIX));

    const leaderName = leader.playerName;
    const leaderPoints = leader.points ?? 0;
    const leaderEfficiency = leader.efficiency ?? 0;

    if (leaderName.startsWith(AI_AGENT_PREFIX)) {
      return t('pool.trendAiLeads', { name: leaderName, points: leaderPoints, eff: leaderEfficiency });
    }

    if (userRow && userRow.playerName === leaderName) {
      const nextAi = aiRows[0];
      const aiText = nextAi ? t('pool.trendYouLeadAi', { name: nextAi.playerName }) : '';
      return t('pool.trendYouLead', { points: leaderPoints, eff: leaderEfficiency, aiText });
    }

    return t('pool.trendLeader', { name: leaderName, points: leaderPoints });
  }, [leaderboard, pool.playerName, t]);

  // Determine what is visible in the active tab
  const visible = useMemo(() => {
    if (activeTab === 'predict') {
      return view === 'next' ? upcomingMatches.slice(0, 12) : upcomingMatches;
    }
    return playedMatches; // results shows all played matches
  }, [activeTab, view, upcomingMatches, playedMatches]);

  const pickedPending = upcomingMatches.filter((m) => pool.picks[m.id]?.outcome).length;
  const completeScoresPending = upcomingMatches.filter((m) => {
    const p = pool.picks[m.id];
    return p?.homeGoals != null && p?.awayGoals != null;
  }).length;
  const poolAlerts = useMemo(
    () => buildPoolAlerts({ upcomingMatches, picks: pool.picks, teams, syncStatus, t }),
    [upcomingMatches, pool.picks, teams, syncStatus, t],
  );
  const poolAwards = useMemo(
    () => buildPoolAwards({ stats, pickedPending, totalPending: upcomingMatches.length, leaderboard, playerName: pool.playerName, t }),
    [stats, pickedPending, upcomingMatches.length, leaderboard, pool.playerName, t],
  );
  const poolDiagnostics = useMemo(
    () => buildPoolDiagnostics(data?.items ?? [], pool.picks, leaderboard, pool.playerName, t),
    [data?.items, pool.picks, leaderboard, pool.playerName, t],
  );

  // Proactive AI notifications (fires once per session)
  useProactiveAI({ matches: data?.items ?? [], picks: pool.picks, playerName: pool.playerName, leaderboard });

  const shareNextPick = async () => {
    const match = upcomingMatches.find((m) => {
      const pick = pool.picks[m.id];
      return pick?.homeGoals != null && pick.awayGoals != null;
    }) ?? upcomingMatches[0];
    if (!match) {
      notifyInfo(t('pool.noMatchesShare'), t('pool.noMatchesShareText'));
      return;
    }
    const pick = pool.picks[match.id];
    if (!pick?.outcome) {
      notifyInfo(t('pool.pickIncomplete'), t('pool.pickIncompleteText'));
      return;
    }
    await shareTextCard({
      title: `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}`,
      subtitle: t('pool.sharePickSubtitle', { name: pool.playerName || t('pool.defaultPlayer'), date: fmtDay(match.date), time: match.time }),
      lines: [
        t('pool.sharePickLine', { pick: pickScoreText(pick, t) }),
        t('pool.sharePickWinner', { winner: outcomeText(pick.outcome, t) }),
        lockLabel(match, t),
        t('pool.sharePickGroup', { g: normalizePoolGroupId(pool.groupId) }),
      ],
      footer: t('pool.footerPool2026'),
      fileName: `prediccion-${match.id}-${normalizePoolGroupId(pool.groupId)}.png`,
    });
  };

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="pool-hero card">
        <div className="pool-cup">
          <img src="/brand/fwc26-emblem.svg" alt="Copa 2026" loading="lazy" decoding="async" />
        </div>
        <div className="pool-copy">
          <span className="mono-label">{t('pool.title')}</span>
          <h2>{t('pool.heroTitle')}</h2>
          <p>{t('pool.heroDesc')}</p>
        </div>
        <div className="pool-profile">
          <label className="mono-label" htmlFor="pool-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('pool.participant')}</span>
            {syncStatus && (
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  color: syncStatus === 'synced' ? 'var(--gold)' : syncStatus === 'syncing' ? 'var(--tx-3)' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Icon name={syncStatus === 'synced' ? 'check' : syncStatus === 'syncing' ? 'sparkSmall' : 'close'} size={11} />
                {syncStatus === 'synced' ? t('pool.savedCloud') : syncStatus === 'syncing' ? t('pool.syncingShort') : t('pool.offline')}
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
            <input
              id="pool-name"
              value={pool.playerName}
              onChange={(e) => pool.setPlayerName(e.target.value)}
              placeholder={t('pool.yourName')}
              style={{ flex: 1, minWidth: '120px' }}
            />
            {/* Accent Theme Color Dot Selector */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: '10px', padding: '0 8px', height: '42px', alignItems: 'center', boxSizing: 'border-box' }}>
              {(['gold', 'emerald', 'crimson'] as const).map((acc) => {
                const colors = {
                  gold: '#c9a24b',
                  emerald: '#10b981',
                  crimson: '#e11d48',
                };
                const active = accent === acc;
                return (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => changeAccent(acc)}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: colors[acc],
                      border: active ? '2px solid var(--tx)' : 'none',
                      cursor: 'pointer',
                      transform: active ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: active ? '0 0 4px rgba(0,0,0,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      padding: 0,
                    }}
                    title={t('pool.accentTitle', { name: acc === 'gold' ? t('pool.accentGold') : acc === 'emerald' ? t('pool.accentEmerald') : t('pool.accentCrimson') })}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn btn ghost"
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--gold)',
                transition: 'all 0.2s ease',
                padding: 0,
                flexShrink: 0
              }}
              title={theme === 'dark' ? t('pool.themeLight') : t('pool.themeDark')}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
          <div className="pool-family-panel">
            <div className="pool-avatar-preview">
              {pool.avatarUrl ? <img src={pool.avatarUrl} alt={pool.playerName || t('pool.participant')} loading="lazy" /> : <Icon name="user" size={18} />}
            </div>
            <input
              value={pool.avatarUrl}
              onChange={(e) => pool.setAvatarUrl(e.target.value)}
              placeholder={t('pool.avatarUrl')}
              aria-label={t('pool.avatarUrl')}
            />
          </div>
          <div className="pool-family-panel">
            <label className="mono-label" htmlFor="pool-group" style={{ margin: 0 }}>
              {t('pool.group')}
            </label>
            <input
              id="pool-group"
              value={pool.groupId}
              onChange={(e) => pool.setGroupId(normalizePoolGroupId(e.target.value))}
              placeholder="familia-2026"
              aria-label={t('pool.group')}
            />
            <button type="button" className="btn ghost btn-sm" onClick={copyInviteLink}>
              <Icon name="share" size={13} />
              {inviteCopied ? t('pool.copied') : t('pool.invite')}
            </button>
          </div>
        </div>
      </div>

      <div className="pool-rules-strip">
        <span><Icon name="trophy" size={13} /> {t('pool.ruleExact')}</span>
        <span><Icon name="check" size={13} /> {t('pool.ruleWinner')}</span>
        <span><Icon name="clock" size={13} /> {t('pool.ruleClose')}</span>
        <span><Icon name="shield" size={13} /> {t('pool.ruleGroup', { g: normalizePoolGroupId(pool.groupId) })}</span>
      </div>

      <FamilySetupGuide
        playerReady={Boolean(pool.playerName.trim())}
        groupId={normalizePoolGroupId(pool.groupId)}
        picked={pickedPending}
        total={upcomingMatches.length}
        syncStatus={syncStatus}
        inviteCopied={inviteCopied}
        onInvite={copyInviteLink}
      />

      <FamilyInviteKit
        groupId={normalizePoolGroupId(pool.groupId)}
        participantCount={leaderboard.filter((row) => !row.playerName.startsWith(AI_AGENT_PREFIX)).length}
        picked={pickedPending}
        total={upcomingMatches.length}
        inviteCopied={inviteCopied}
        onCopyInvite={copyInviteLink}
        onShareInvite={shareInviteCard}
      />

      <PoolCommandCenter
        alerts={poolAlerts}
        awards={poolAwards}
        picked={pickedPending}
        total={upcomingMatches.length}
        completeScores={completeScoresPending}
        lastSavedAt={lastSavedAt}
        onSharePick={shareNextPick}
        onShareTable={shareFamilyTable}
        onShareAchievement={shareLeaderboardLogro}
      />

      <div className="pool-tabs" role="tablist" aria-label={t('pool.poolSections')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'predict'}
          aria-controls="pool-panel-predict"
          id="pool-tab-predict"
          className={`pool-tab${activeTab === 'predict' ? ' on' : ''}`}
          onClick={() => { setActiveTab('predict'); playTick(); }}
        >
          <Icon name="calendar" size={15} />
          {t('pool.tabPredict')}
          <span className="pool-tab-badge">{upcomingMatches.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'results'}
          aria-controls="pool-panel-results"
          id="pool-tab-results"
          className={`pool-tab${activeTab === 'results' ? ' on' : ''}`}
          onClick={() => { setActiveTab('results'); playTick(); }}
        >
          <Icon name="trophy" size={15} />
          {t('pool.tabResults')}
          <span className="pool-tab-badge">{playedMatches.length}</span>
        </button>
      </div>

      {/* Dynamic AI Trend Alert Strip */}
      <div
        className="card card-pad trend-alert-strip"
        style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.02))',
          border: '1px solid var(--gold-line)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          animation: 'fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold-soft)', flexShrink: 0 }}>
          <Icon name="ai" size={16} style={{ color: 'var(--gold)' }} />
        </div>
        <div style={{ flex: 1, fontSize: '13px', color: 'var(--tx-2)', fontWeight: 500, lineHeight: '1.4' }}>
          {trendAlert}
        </div>
      </div>

      <FamilyLearningPanel diagnostics={poolDiagnostics} />

      {pool.playerName && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 18 }}>
          <P2PSyncPanel
            playerName={pool.playerName}
            picks={pool.picks}
            onSyncComplete={handleP2PSyncComplete}
          />
          {upcomingMatches.length > 0 && (
            <RetoRelampago
              playerName={pool.playerName}
              activeMatchId={upcomingMatches[0].id}
              activeMatchName={`${upcomingMatches[0].home} vs ${upcomingMatches[0].away}`}
            />
          )}
        </div>
      )}

      {activeTab === 'predict' ? (
        <div className="pool-summary">
          <SummaryTile icon="check" label={t('pool.matchesChosen')} value={`${pickedPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="target" label={t('pool.scores')} value={`${completeScoresPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="calendar" label={t('pool.viewLabel')} value={view === 'next' ? t('pool.viewNext12') : t('pool.viewFull')} />
          <div className="card card-pad pool-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn gold" onClick={() => setView(view === 'next' ? 'all' : 'next')}>
              <Icon name={view === 'next' ? 'list' : 'calendar'} size={15} />
              {view === 'next' ? t('pool.viewAll') : t('pool.viewNext')}
            </button>
            <button type="button" className="btn ghost" onClick={() => pool.reset()}>
              <Icon name="close" size={15} />
              {t('pool.reset')}
            </button>
            <button type="button" className="btn ghost" onClick={exportCSV} title={t('pool.exportCsvTitle')}>
              <Icon name="download" size={15} />
              {t('pool.exportCsv')}
            </button>
            <button type="button" className="btn ghost" onClick={() => window.print()} title={t('pool.printPdfTitle')}>
              <Icon name="print" size={15} />
              {t('pool.printPdf')}
            </button>
            <button
              type="button"
              className="btn ghost animate-fade-in"
              onClick={() => setShowScanner(true)}
              title={t('pool.scanPaperTitle')}
              disabled={role === 'guest'}
            >
              <Icon name="camera" size={15} style={{ color: 'var(--gold)' }} />
              {t('pool.scanPaper')}
            </button>
          </div>
        </div>
      ) : (
        <div className="pool-summary">
          <SummaryTile icon="trophy" label={t('pool.totalPoints')} value={`${stats.totalPoints} pts`} />
          <SummaryTile icon="activity" label={t('pool.efficiency')} value={`${stats.efficiency}%`} />
          <SummaryTile icon="target" label={t('pool.playedPredictions')} value={`${stats.playedWithPrediction}/${playedMatches.length}`} />
          <SummaryTile icon="check" label={t('pool.exactScores')} value={`${stats.exactScores}`} />
        </div>
      )}

      {activeTab === 'predict' && (
        <div className="copilot-section" id="pool-panel-predict" role="tabpanel" aria-labelledby="pool-tab-predict">
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <Icon name="ai" size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{t('pool.copilots')}</h3>
            <span className="badge gold">{t('pool.beta')}</span>
          </div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: 12 }}>
            {t('pool.copilotsDesc')}
          </p>
          <div className="ai-guard-note">
            <Icon name="shield" size={13} />
            {t('pool.copilotsGuard')}
          </div>
          {role === 'guest' && (
            <div className="ai-guard-note">
              <Icon name="shield" size={13} />
              {t('pool.guestGuard')}
            </div>
          )}

          {agentError && (
            <div
              className="card card-pad"
              style={{
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--tx-2)',
                fontSize: 13,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <Icon name="close" size={14} style={{ color: 'rgb(239, 68, 68)' }} />
              {agentError}
            </div>
          )}

          <div className="copilot-grid">
            <div className={`copilot-card${activeAgent === 'optimista' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">GO</div>
                <div className="copilot-meta">
                  <h3>{t('pool.agentOptimistName')}</h3>
                  <p>{t('pool.agentOptimistDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'optimista' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('optimista')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'optimista' ? t('pool.summoning') : activeAgent === 'optimista' ? t('pool.active') : t('pool.summonOptimist')}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'stats' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">ES</div>
                <div className="copilot-meta">
                  <h3>{t('pool.agentStatsName')}</h3>
                  <p>{t('pool.agentStatsDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'stats' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('stats')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'stats' ? t('pool.summoning') : activeAgent === 'stats' ? t('pool.active') : t('pool.summonStats')}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'contrarian' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">UP</div>
                <div className="copilot-meta">
                  <h3>{t('pool.agentContrarianName')}</h3>
                  <p>{t('pool.agentContrarianDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'contrarian' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('contrarian')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'contrarian' ? t('pool.summoning') : activeAgent === 'contrarian' ? t('pool.active') : t('pool.summonContrarian')}
              </button>
            </div>
          </div>

          {activeAgent && agentBrief && (
            <div className="copilot-brief">
              <Icon name="ai" size={18} style={{ color: 'var(--gold)' }} />
              <div>
                <span className="mono-label" style={{ display: 'block', marginBottom: 4, color: 'var(--gold)' }}>
                  {t('pool.briefTitle', { agent: activeAgent === 'optimista' ? t('pool.agentOptimist') : activeAgent === 'stats' ? t('pool.agentStats') : t('pool.agentContrarian') })}
                </span>
                <p className="copilot-brief-text">{agentBrief}</p>
                <details className="copilot-trace" style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--tx-3)', fontWeight: 600, marginBottom: 4 }}>
                    <Icon name="info" size={11} /> {t('pool.whyPrediction')}
                  </summary>
                  <div style={{ paddingTop: 6, fontSize: 11, color: 'var(--tx-3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span><strong>{t('pool.confidence')}</strong> {agentMeta?.confidence ?? t('sourceBadge.medium')}</span>
                    <span><strong>{t('pool.dataUsed')}</strong> {(agentMeta?.dataUsed ?? [t('pool.dataCalendar'), t('pool.dataTeams')]).join(', ')}</span>
                    <span><strong>{t('pool.dataNotUsed')}</strong> {(agentMeta?.ignoredData ?? [t('pool.dataExternalNews'), t('pool.dataInjuries'), t('pool.dataLineups')]).join(', ')}</span>
                    {agentMeta?.warning && <span><strong>{t('pool.limitation')}</strong> {agentMeta.warning}</span>}
                    <span style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.7 }}>
                      {t('pool.briefDisclaimer')}
                    </span>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="copilot-section" id="pool-panel-results" role="tabpanel" aria-labelledby="pool-tab-results" style={{ marginBottom: 24 }}>
          <div className="row spread align-center animate-fade-in" style={{ marginBottom: 6 }}>
            <div className="row gap-8 align-center">
              <Icon name="trophy" size={16} style={{ color: 'var(--gold)' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{t('pool.ranking')}</h3>
              <span className="badge gold">{t('pool.shared')}</span>
            </div>
            {leaderboard.length > 0 && (
              <div className="row gap-6 wrap">
                <button
                  type="button"
                  className="btn gold btn-sm"
                  style={{ height: 26, fontSize: 11, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={shareLeaderboardLogro}
                >
                  <Icon name="share" size={11} /> {t('pool.shareAchievement')}
                </button>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{ height: 26, fontSize: 11, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={shareFamilyTable}
                >
                  <Icon name="list" size={11} /> {t('pool.shareTable')}
                </button>
              </div>
            )}
          </div>
          <p className="muted" style={{ margin: '0 0 12px 0', fontSize: 12 }}>
            {t('pool.rankingDesc')}
          </p>

          {loadingLeaderboard ? (
            <p className="muted" role="status" aria-live="polite" style={{ fontSize: 13 }}>{t('pool.loadingTable')}</p>
          ) : !leaderboard.length ? (
            <div className="card card-pad muted" style={{ fontSize: 13, textAlign: 'center' }}>
              {t('pool.noSyncedPredictions')}
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--gold-line)' }}>
              {leaderboard.length > 1 && pool.playerName && (() => {
                const userIdx = leaderboard.findIndex(r => r.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase());
                if (userIdx < 0) return null;
                const userRow = leaderboard[userIdx];
                const leader = leaderboard[0];
                const isLeading = userIdx === 0;
                const gap = isLeading ? 0 : leader.points - (userRow?.points ?? 0);
                const aheadName = userIdx > 0 ? leaderboard[userIdx - 1]?.playerName : null;

                if (isLeading) return (
                  <div className="card card-pad" style={{ background: 'rgba(56,211,154,0.06)', border: '1px solid rgba(56,211,154,0.2)', marginBottom: 12, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon name="trophy" size={14} style={{ color: 'var(--color-success)' }} />
                    <span>{t('pool.youLeading')}</span>
                  </div>
                );

                if (gap <= 6) return (
                  <div className="card card-pad" style={{ background: 'rgba(201,162,75,0.06)', border: '1px solid var(--gold-line)', marginBottom: 12, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon name="ai" size={14} style={{ color: 'var(--gold)' }} />
                    <span>{t('pool.gapHint', { gap, name: aheadName ?? t('pool.theTop') })}</span>
                  </div>
                );

                return null;
              })()}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700 }}>{t('pool.colPos')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700 }}>{t('pool.colParticipant')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>{t('pool.colPoints')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>{t('pool.colExact')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>{t('pool.colHits')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>{t('pool.colEfficiency')}</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>{t('pool.colPicks')}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => {
                    const medal = index < 3 ? `Top ${index + 1}` : `${index + 1}º`;
                    const isCurrentUser = row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase();
                    const isAiAgent = row.playerName.startsWith(AI_AGENT_PREFIX);

                    return (
                      <tr
                        key={row.playerName}
                        className={isAiAgent ? `ai-gala-row${loadingAgent ? ' computing' : ''}` : ''}
                        style={{
                          borderBottom: '1px solid var(--line)',
                          background: isCurrentUser ? 'var(--gold-soft)' : 'transparent',
                          fontWeight: isCurrentUser ? '700' : 'normal',
                          color: isCurrentUser ? 'var(--gold-2)' : 'var(--tx)',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 'bold' }}>{medal}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {row.avatarUrl ? (
                              <img
                                src={row.avatarUrl}
                                alt={row.playerName}
                                loading="lazy"
                                style={{ width: 22, height: 22, borderRadius: 7, objectFit: 'cover', border: '1px solid var(--line)' }}
                              />
                            ) : (
                              <span className="pool-avatar-mini">{row.playerName.slice(0, 1).toUpperCase()}</span>
                            )}
                            {row.playerName}
                            {isCurrentUser && <span className="badge gold" style={{ fontSize: 9 }}>{t('pool.you')}</span>}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>{row.points}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>{row.exactScores}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>{row.outcomeHits}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold' }}>{row.efficiency}%</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--tx-3)' }}>{row.predictedCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="muted" role="status" aria-live="polite">{t('pool.loadingPool')}</p>
      ) : !visible.length ? (
        <Empty
          icon="trophy"
          title={activeTab === 'predict' ? t('pool.emptyPredictTitle') : t('pool.emptyResultsTitle')}
          text={
            activeTab === 'predict'
              ? t('pool.emptyPredictText')
              : t('pool.emptyResultsText')
          }
        />
      ) : (
        <>
          {activeTab === 'predict' && (
            <PickHistoryPanel matches={upcomingMatches} picks={pool.picks} teams={teams} />
          )}
          <div className="pool-grid">
            {visible.map((m) => (
              <PoolMatch key={m.id} match={m} homeName={teams[m.home]?.name ?? m.home} awayName={teams[m.away]?.name ?? m.away} />
            ))}
          </div>
        </>
      )}

      {showScanner && (
        <QuinielaScanner
          onClose={() => setShowScanner(false)}
          onScanSuccess={(predictions) => {
            pool.importPicks(predictions);
          }}
          matches={upcomingMatches.map((m) => ({
            id: m.id,
            home: m.home,
            away: m.away,
            homeName: teams[m.home]?.name ?? m.home,
            awayName: teams[m.away]?.name ?? m.away,
          }))}
        />
      )}
    </div>
  );
}


