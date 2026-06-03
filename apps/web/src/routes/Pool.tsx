import { useEffect, useMemo, useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import { usePool, type PoolOutcome, type PoolPick } from '@/store/pool';
import { usePreferences } from '@/store/preferences';
import { askPoolAgent } from '@/lib/aiClient';
import { fetchPoolPicks, normalizePoolGroupId, syncPoolPicks, type LeaderboardEntry } from '@/lib/api';
import { isMatchLocked, lockLabel, weatherSummary } from '@/lib/matchMeta';
import { buildPoolDiagnostics } from '@/lib/opsIntelligence';
import { shareTextCard } from '@/lib/shareCards';
import { getBrowserAudioContext } from '@/lib/audioSynth';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { notifySuccess, notifyWarning } from '@/store/notifications';

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

function outcomeText(outcome?: PoolOutcome): string {
  if (outcome === 'home') return 'Gana local';
  if (outcome === 'away') return 'Gana visita';
  if (outcome === 'draw') return 'Empate';
  return 'Sin ganador';
}

function pickScoreText(pick?: PoolPick): string {
  if (pick?.homeGoals != null && pick.awayGoals != null) return `${pick.homeGoals}-${pick.awayGoals}`;
  return outcomeText(pick?.outcome);
}

function timeToKickoff(match: Match): string {
  const kickoff = Date.parse(`${match.date}T${match.time || '00:00'}:00`);
  if (!Number.isFinite(kickoff)) return 'Hora por confirmar';
  const diff = kickoff - Date.now();
  if (diff <= 0) return 'Por iniciar';
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
}: {
  upcomingMatches: Match[];
  picks: Record<string, PoolPick>;
  teams: Record<string, { name?: string } | undefined>;
  syncStatus: 'synced' | 'syncing' | 'error' | null;
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
      title: 'Próximo cierre',
      text: `${teams[nextOpen.home]?.name ?? nextOpen.home} vs ${teams[nextOpen.away]?.name ?? nextOpen.away} cierra en ${timeToKickoff(nextOpen)}.`,
      tone: firstMissing?.id === nextOpen.id ? 'warn' : 'info',
    });
  }

  if (firstMissing) {
    alerts.push({
      icon: 'target',
      title: 'Pick pendiente',
      text: `Falta ganador para ${teams[firstMissing.home]?.name ?? firstMissing.home} vs ${teams[firstMissing.away]?.name ?? firstMissing.away}.`,
      tone: 'warn',
    });
  } else if (upcomingMatches.length) {
    alerts.push({
      icon: 'check',
      title: 'Ganadores completos',
      text: 'Todos los partidos pendientes tienen ganador/empate seleccionado.',
      tone: 'ok',
    });
  }

  if (firstMissingScore) {
    alerts.push({
      icon: 'activity',
      title: 'Marcador por cerrar',
      text: `Completa goles para convertir ${teams[firstMissingScore.home]?.name ?? firstMissingScore.home} vs ${teams[firstMissingScore.away]?.name ?? firstMissingScore.away} en pick compartible.`,
      tone: 'warn',
    });
  }

  if (nextOpen) {
    const weather = weatherSummary(nextOpen.id);
    alerts.push({
      icon: 'rain',
      title: 'Clima del siguiente juego',
      text: `${weather.label}. ${weather.confidence === 'Pendiente' ? 'Se actualizará con forecast cercano.' : weather.detail}`,
      tone: weather.confidence === 'Pendiente' ? 'warn' : 'info',
    });
  }

  alerts.push({
    icon: syncStatus === 'error' ? 'close' : syncStatus === 'syncing' ? 'cloud' : 'shield',
    title: 'Nube familiar',
    text: syncStatus === 'synced' ? 'Tus cambios están guardados en la base compartida.' : syncStatus === 'syncing' ? 'Guardando cambios en segundo plano.' : syncStatus === 'error' ? 'Sincronización pendiente; la app reintentará.' : 'Escribe tu alias para activar guardado.',
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
}: {
  stats: { exactScores: number; efficiency: number; totalPoints: number };
  pickedPending: number;
  totalPending: number;
  leaderboard: LeaderboardEntry[];
  playerName: string;
}): PoolAward[] {
  const currentRank = leaderboard.findIndex((row) => row.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()) + 1;
  return [
    {
      icon: 'check',
      title: 'Constancia',
      text: totalPending ? `${pickedPending}/${totalPending} próximos con pick.` : 'Lista para resultados.',
      active: totalPending > 0 && pickedPending === totalPending,
    },
    {
      icon: 'target',
      title: 'Marcador fino',
      text: `${stats.exactScores} plenos exactos.`,
      active: stats.exactScores > 0,
    },
    {
      icon: 'trophy',
      title: 'Puntero familiar',
      text: currentRank > 0 ? `Puesto ${currentRank} con ${stats.totalPoints} pts.` : 'Aparece al sincronizar.',
      active: currentRank === 1,
    },
    {
      icon: 'activity',
      title: 'Efectividad',
      text: `${stats.efficiency}% en partidos jugados.`,
      active: stats.efficiency >= 50,
    },
  ];
}

export function Pool() {
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
      setAgentError('Modo invitado: los co-pilotos remotos están desactivados para proteger consumo.');
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
      weatherLabel: weatherSummary(m.id).label,
      weatherConfidence: weatherSummary(m.id).confidence,
      dataConfidence: 'Calendario local confirmado',
    }));

    try {
      const res = await askPoolAgent(agentName, matchesToPredict);
      if (res.ok && res.predictions) {
        pool.importPicks(res.predictions);
        setActiveAgent(agentName);
        setAgentBrief(res.brief ?? null);
        setAgentMeta(res.meta ?? {
          confidence: 'Media',
          dataUsed: ['calendario', 'selecciones'],
          ignoredData: ['noticias externas', 'lesiones', 'alineaciones'],
          warning: 'Pronóstico previo sin noticias externas ni alineaciones confirmadas.',
        });
      } else {
        setAgentError(
          res.reason === 'no-key'
            ? 'No se ha configurado la clave del proveedor IA para habilitar co-pilotos.'
            : 'Error al conectar con el co-piloto.',
        );
        setAgentMeta(null);
      }
    } catch {
      setAgentError('Error de red al invocar al co-piloto.');
    } finally {
      setLoadingAgent(false);
    }
  };

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const shareLeaderboardLogro = async () => {
    const userRow = leaderboard.find((row) => row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase());
    if (!userRow) {
      alert('Asegúrate de registrar tu nombre en el perfil para compartir tu puesto.');
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
    ctx.fillText('COPA MUNDIAL DE LA FIFA 2026', 300, 50);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('QUINIELA FAMILIAR OFICIAL DE GALA', 300, 70);

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
    ctx.fillText(`${medal} PUESTO Nº ${rankNum} ${medal ? '' : 'º'}`, 300, 185);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px monospace';
    ctx.fillText('PUNTOS', 150, 230);
    ctx.fillText('EFECTIVIDAD', 300, 230);
    ctx.fillText('PLENOS (+3)', 450, 230);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${userRow.points}`, 150, 270);
    ctx.fillText(`${userRow.efficiency}%`, 300, 270);
    ctx.fillText(`${userRow.exactScores}`, 450, 270);

    ctx.fillStyle = 'rgba(201, 162, 75, 0.6)';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText('¡Desafía a tu familia en tiempo real en la quiniela!', 300, 340);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px sans-serif';
    ctx.fillText('✨ Quiniela IA Native ✨', 300, 365);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'Quiniela_Gala_Logro.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Mi Logro en la Quiniela FIFA 2026',
            text: `Voy en el puesto ${rankNum} con ${userRow.points} puntos en la quiniela familiar. ¿Quién me supera?`,
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
        alert('Tu tarjeta de gala se ha descargado con éxito. ¡Compártela en tus redes favoritas!');
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
    } catch (e) {
      console.error('Failed to save peer picks to Firestore:', e);
    }
  };

  // Load existing picks from DB when the participant name changes
  useEffect(() => {
    if (!pool.playerName.trim()) return;

    const loadPicks = async () => {
      try {
        const res = await fetchPoolPicks(pool.playerName, pool.groupId);
        if (res.ok && res.picks && Object.keys(res.picks).length > 0) {
          pool.importPicks(res.picks);
          if (res.avatarUrl && !pool.avatarUrl) pool.setAvatarUrl(res.avatarUrl);
          setSyncStatus('synced');
        }
      } catch (e) {
        console.error('Failed to load picks from Firestore', e);
      }
    };
    loadPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.playerName, pool.groupId]);

  // Sync picks to Firestore (debounced to avoid spamming the connection)
  useEffect(() => {
    if (!pool.playerName.trim()) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const ok = await syncPoolPicks(pool.playerName, pool.picks, pool.groupId, pool.avatarUrl);
        if (ok) {
          setSyncStatus('synced');
          setLastSavedAt(new Date().toISOString());
          playSuccessTick(); // Play premium tactical success chime when successfully saved to DB!
          notifySuccess('Quiniela guardada', 'Tus picks se sincronizaron en la nube familiar.');
        } else {
          setSyncStatus('error');
          // Offline fallback: attempt to register Background Sync
          registerPoolBackgroundSync()
            .catch(() => {});
          notifyWarning('Sin conexión', 'La quiniela se guardará automáticamente cuando se restaure la red.');
        }
      } catch {
        setSyncStatus('error');
        registerPoolBackgroundSync().catch(() => {});
        notifyWarning('Sin conexión', 'La quiniela se guardará automáticamente cuando se restaure la red.');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [pool.playerName, pool.picks, pool.groupId, pool.avatarUrl]);

  // Fallback listener for online window event
  useEffect(() => {
    const handleOnline = async () => {
      if (!pool.playerName.trim()) return;
      setSyncStatus('syncing');
      try {
        const ok = await syncPoolPicks(pool.playerName, pool.picks, pool.groupId, pool.avatarUrl);
        if (ok) {
          setSyncStatus('synced');
          setLastSavedAt(new Date().toISOString());
          playSuccessTick();
        } else {
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus('error');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pool.playerName, pool.picks, pool.groupId, pool.avatarUrl]);

  // Load Leaderboard in real-time from Firestore onSnapshot
  useEffect(() => {
    const matchItems = data?.items ?? [];
    const teamItems = Object.values(teams);
    const teamMap = new Map(teamItems.map((t) => [t.code, t]));

    if (isLoading || !matchItems.length) return;

    setLoadingLeaderboard(true);

    const unsubscribe = onSnapshot(
      collection(db, 'poolGroups', normalizePoolGroupId(pool.groupId), 'members'),
      (snapshot) => {
        const board: LeaderboardEntry[] = [];
        const playedMatches = matchItems.filter((m) => m.status === 'FT');

        // 1. Process all participant predictions from Firestore documents
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const name = typeof docData.playerName === 'string' ? docData.playerName : docSnap.id;
          const picks = docData.picks || {};

          let points = 0;
          let exactScores = 0;
          let outcomeHits = 0;
          let predictedPlayedCount = 0;

          for (const m of playedMatches) {
            const pick = picks[m.id];
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
            predictedCount: Object.keys(picks).length,
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
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        setLoadingLeaderboard(false);
      }
    );

    return () => unsubscribe();
  }, [data, teams, isLoading, pool.groupId]);

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
    csvContent += 'Partido,Fecha,Prediccion Local,Prediccion Visita,Resultado Real,Estado\n';

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
    link.setAttribute('download', `quiniela_${pool.playerName || 'familiar'}.csv`);
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
      window.prompt('Copia este link de invitacion:', url);
    }
  };

  const shareFamilyTable = async () => {
    if (!leaderboard.length) {
      alert('Todavia no hay tabla familiar para compartir.');
      return;
    }
    await shareTextCard({
      title: 'Tabla familiar',
      subtitle: `Grupo ${normalizePoolGroupId(pool.groupId)}`,
      lines: leaderboard.slice(0, 6).map((row, index) => {
        const place = index + 1;
        return `${place}. ${row.playerName}: ${row.points} pts, ${row.exactScores} plenos, ${row.efficiency}%`;
      }),
      footer: 'Quiniela familiar Mundial 2026',
      fileName: `tabla-${normalizePoolGroupId(pool.groupId)}.png`,
    });
  };

  const shareInviteCard = async () => {
    const group = normalizePoolGroupId(pool.groupId);
    const url = `${window.location.origin}/pool?group=${encodeURIComponent(group)}`;
    await shareTextCard({
      title: 'Únete a la quiniela familiar',
      subtitle: `Grupo familiar ${group}`,
      lines: [
        '1. Abre el link y escribe tu alias.',
        '2. Captura tus marcadores antes de cada partido.',
        '3. La tabla familiar se actualiza con resultados reales.',
        url,
      ],
      footer: 'Mundial 2026 familiar',
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
      return "Analista IA: registra tus pronósticos para comparar rendimiento con la familia y con los co-pilotos tácticos.";
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
      return `Tendencia IA: ${leaderName} lidera el ranking familiar con ${leaderPoints} pts y ${leaderEfficiency}% de efectividad. Revisa sus picks antes de seguir esa estrategia.`;
    }

    if (userRow && userRow.playerName === leaderName) {
      const nextAi = aiRows[0];
      const aiText = nextAi ? `, pero ${nextAi.playerName} te pisa los talones en la tabla` : '';
      return `Vas liderando el ranking familiar con ${leaderPoints} pts y ${leaderEfficiency}% de efectividad. Excelente consistencia táctica${aiText}.`;
    }

    return `Tendencia del líder: ${leaderName} lidera la tabla con ${leaderPoints} pts. Te recomendamos invocar al Simulador Estadístico para afinar tu puntería defensiva.`;
  }, [leaderboard, pool.playerName]);

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
    () => buildPoolAlerts({ upcomingMatches, picks: pool.picks, teams, syncStatus }),
    [upcomingMatches, pool.picks, teams, syncStatus],
  );
  const poolAwards = useMemo(
    () => buildPoolAwards({ stats, pickedPending, totalPending: upcomingMatches.length, leaderboard, playerName: pool.playerName }),
    [stats, pickedPending, upcomingMatches.length, leaderboard, pool.playerName],
  );
  const poolDiagnostics = useMemo(
    () => buildPoolDiagnostics(data?.items ?? [], pool.picks, leaderboard, pool.playerName),
    [data?.items, pool.picks, leaderboard, pool.playerName],
  );

  const shareNextPick = async () => {
    const match = upcomingMatches.find((m) => {
      const pick = pool.picks[m.id];
      return pick?.homeGoals != null && pick.awayGoals != null;
    }) ?? upcomingMatches[0];
    if (!match) {
      alert('No hay partidos pendientes para compartir.');
      return;
    }
    const pick = pool.picks[match.id];
    if (!pick?.outcome) {
      alert('Primero captura al menos un ganador o empate para compartir tu predicción.');
      return;
    }
    await shareTextCard({
      title: `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}`,
      subtitle: `Predicción de ${pool.playerName || 'familia'} · ${fmtDay(match.date)} ${match.time}`,
      lines: [
        `Pick: ${pickScoreText(pick)}`,
        `Ganador: ${outcomeText(pick.outcome)}`,
        lockLabel(match),
        `Grupo familiar: ${normalizePoolGroupId(pool.groupId)}`,
      ],
      footer: 'Quiniela familiar Mundial 2026',
      fileName: `prediccion-${match.id}-${normalizePoolGroupId(pool.groupId)}.png`,
    });
  };

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="pool-hero card">
        <div className="pool-cup">
          <img src="/brand/fwc26-emblem.svg" alt="FIFA World Cup 26" loading="lazy" decoding="async" />
        </div>
        <div className="pool-copy">
          <span className="mono-label">Quiniela familiar</span>
          <h2>Pronósticos para compartir en casa</h2>
          <p>
            Guarda tus picks en la nube familiar. Cuando empiece el torneo, los resultados reales servirán para
            comparar aciertos entre todos.
          </p>
        </div>
        <div className="pool-profile">
          <label className="mono-label" htmlFor="pool-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Participante</span>
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
                {syncStatus === 'synced' ? 'Guardado en nube' : syncStatus === 'syncing' ? 'Sincronizando…' : 'Sin conexión'}
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
            <input
              id="pool-name"
              value={pool.playerName}
              onChange={(e) => pool.setPlayerName(e.target.value)}
              placeholder="Tu nombre"
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
                    title={`Acento ${acc === 'gold' ? 'Dorado' : acc === 'emerald' ? 'Esmeralda' : 'Carmesí'}`}
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
              title={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
          <div className="pool-family-panel">
            <div className="pool-avatar-preview">
              {pool.avatarUrl ? <img src={pool.avatarUrl} alt={pool.playerName || 'Participante'} loading="lazy" /> : <Icon name="user" size={18} />}
            </div>
            <input
              value={pool.avatarUrl}
              onChange={(e) => pool.setAvatarUrl(e.target.value)}
              placeholder="URL de foto/avatar"
              aria-label="URL de foto/avatar"
            />
          </div>
          <div className="pool-family-panel">
            <label className="mono-label" htmlFor="pool-group" style={{ margin: 0 }}>
              Grupo
            </label>
            <input
              id="pool-group"
              value={pool.groupId}
              onChange={(e) => pool.setGroupId(normalizePoolGroupId(e.target.value))}
              placeholder="familia-2026"
              aria-label="Grupo familiar"
            />
            <button type="button" className="btn ghost btn-sm" onClick={copyInviteLink}>
              <Icon name="share" size={13} />
              {inviteCopied ? 'Copiado' : 'Invitar'}
            </button>
          </div>
        </div>
      </div>

      <div className="pool-rules-strip">
        <span><Icon name="trophy" size={13} /> Marcador exacto +3</span>
        <span><Icon name="check" size={13} /> Ganador/empate correcto +1</span>
        <span><Icon name="clock" size={13} /> Pronosticos cierran al inicio del partido</span>
        <span><Icon name="shield" size={13} /> Grupo familiar: {normalizePoolGroupId(pool.groupId)}</span>
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

      <div className="pool-tabs">
        <button
          type="button"
          className={`pool-tab${activeTab === 'predict' ? ' on' : ''}`}
          onClick={() => { setActiveTab('predict'); playTick(); }}
        >
          <Icon name="calendar" size={15} />
          Pronosticar
          <span className="pool-tab-badge">{upcomingMatches.length}</span>
        </button>
        <button
          type="button"
          className={`pool-tab${activeTab === 'results' ? ' on' : ''}`}
          onClick={() => { setActiveTab('results'); playTick(); }}
        >
          <Icon name="trophy" size={15} />
          Resultados y Aciertos
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
          <SummaryTile icon="check" label="Partidos elegidos" value={`${pickedPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="target" label="Marcadores" value={`${completeScoresPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="calendar" label="Vista" value={view === 'next' ? 'Próximos 12' : 'Completa'} />
          <div className="card card-pad pool-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn gold" onClick={() => setView(view === 'next' ? 'all' : 'next')}>
              <Icon name={view === 'next' ? 'list' : 'calendar'} size={15} />
              {view === 'next' ? 'Ver todo' : 'Ver próximos'}
            </button>
            <button type="button" className="btn ghost" onClick={() => pool.reset()}>
              <Icon name="close" size={15} />
              Reiniciar
            </button>
            <button type="button" className="btn ghost" onClick={exportCSV} title="Exportar predicciones a CSV">
              <Icon name="download" size={15} />
              Exportar CSV
            </button>
            <button type="button" className="btn ghost" onClick={() => window.print()} title="Imprimir reporte de quiniela en PDF">
              <Icon name="print" size={15} />
              Imprimir PDF
            </button>
            <button
              type="button"
              className="btn ghost animate-fade-in"
              onClick={() => setShowScanner(true)}
              title="Escanear quiniela física manuscrita con cámara"
              disabled={role === 'guest'}
            >
              <Icon name="camera" size={15} style={{ color: 'var(--gold)' }} />
              Escanear Papel
            </button>
          </div>
        </div>
      ) : (
        <div className="pool-summary">
          <SummaryTile icon="trophy" label="Puntos Totales" value={`${stats.totalPoints} pts`} />
          <SummaryTile icon="activity" label="Efectividad" value={`${stats.efficiency}%`} />
          <SummaryTile icon="target" label="Predicciones jugadas" value={`${stats.playedWithPrediction}/${playedMatches.length}`} />
          <SummaryTile icon="check" label="Plenos exactos (+3)" value={`${stats.exactScores}`} />
        </div>
      )}

      {activeTab === 'predict' && (
        <div className="copilot-section">
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <Icon name="ai" size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Co-pilotos Tácticos IA</h3>
            <span className="badge gold">Beta</span>
          </div>
          <p className="muted" style={{ margin: '0 0 4px 0', fontSize: 12 }}>
            Invoca a un asistente de IA táctico para que rellene automáticamente tu quiniela con su filosofía de juego y te dé su justificación.
          </p>
          <div className="ai-guard-note">
            <Icon name="shield" size={13} />
            Co-pilotos basados en calendario, sede y clima base; no usan noticias externas, lesiones ni alineaciones no verificadas.
          </div>
          {role === 'guest' && (
            <div className="ai-guard-note">
              <Icon name="shield" size={13} />
              Modo invitado activo: co-pilotos y scanner quedan en pausa para proteger consumo y permisos.
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
                  <h3>El Analista Optimista</h3>
                  <p>"El fútbol se gana metiendo goles." Predice goleadas, partidos abiertos y confía en superpotencias.</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'optimista' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('optimista')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'optimista' ? 'Convocando…' : activeAgent === 'optimista' ? 'Activo' : 'Invocar Optimista'}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'stats' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">ES</div>
                <div className="copilot-meta">
                  <h3>El Simulador Estadístico</h3>
                  <p>"Las defensas ganan campeonatos." Predice marcadores cerrados y orden táctico estricto.</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'stats' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('stats')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'stats' ? 'Convocando…' : activeAgent === 'stats' ? 'Activo' : 'Invocar Estadístico'}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'contrarian' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">UP</div>
                <div className="copilot-meta">
                  <h3>El Agente Contrarian</h3>
                  <p>"Épica de David contra Goliat." Predice sorpresas de selecciones débiles y resultados atrevidos.</p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${activeAgent === 'contrarian' ? 'gold' : 'ghost'}`}
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => summonAgent('contrarian')}
                disabled={loadingAgent || role === 'guest'}
              >
                {loadingAgent && activeAgent === 'contrarian' ? 'Convocando…' : activeAgent === 'contrarian' ? 'Activo' : 'Invocar Contrarian'}
              </button>
            </div>
          </div>

          {activeAgent && agentBrief && (
            <div className="copilot-brief">
              <Icon name="ai" size={18} style={{ color: 'var(--gold)' }} />
              <div>
                <span className="mono-label" style={{ display: 'block', marginBottom: 4, color: 'var(--gold)' }}>
                  Informe Táctico del Co-piloto ({activeAgent === 'optimista' ? 'Optimista' : activeAgent === 'stats' ? 'Estadístico' : 'Contrarian'})
                </span>
                <p className="copilot-brief-text">{agentBrief}</p>
                <div className="copilot-trace">
                  <span><strong>Confianza:</strong> {agentMeta?.confidence ?? 'Media'}</span>
                  <span><strong>Usó:</strong> {(agentMeta?.dataUsed ?? ['calendario', 'selecciones']).join(', ')}</span>
                  <span><strong>No usó:</strong> {(agentMeta?.ignoredData ?? ['noticias externas', 'lesiones', 'alineaciones']).join(', ')}</span>
                  {agentMeta?.warning ? <span><strong>Nota:</strong> {agentMeta.warning}</span> : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="copilot-section" style={{ marginBottom: 24 }}>
          <div className="row spread align-center animate-fade-in" style={{ marginBottom: 6 }}>
            <div className="row gap-8 align-center">
              <Icon name="trophy" size={16} style={{ color: 'var(--gold)' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Ranking Familiar (Leaderboard)</h3>
              <span className="badge gold">Compartido</span>
            </div>
            {leaderboard.length > 0 && (
              <div className="row gap-6 wrap">
                <button
                  type="button"
                  className="btn gold btn-sm"
                  style={{ height: 26, fontSize: 11, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={shareLeaderboardLogro}
                >
                  <Icon name="share" size={11} /> Compartir logro
                </button>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{ height: 26, fontSize: 11, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={shareFamilyTable}
                >
                  <Icon name="list" size={11} /> Compartir tabla
                </button>
              </div>
            )}
          </div>
          <p className="muted" style={{ margin: '0 0 12px 0', fontSize: 12 }}>
            Puntuaciones en tiempo real de todos los participantes basándose en Firestore y los resultados del torneo.
          </p>

          {loadingLeaderboard ? (
            <p className="muted" style={{ fontSize: 13 }}>Cargando tabla de posiciones…</p>
          ) : !leaderboard.length ? (
            <div className="card card-pad muted" style={{ fontSize: 13, textAlign: 'center' }}>
              No hay predicciones sincronizadas todavía. Escribe tu nombre y guarda algunos marcadores.
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto', border: '1px solid var(--gold-line)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700 }}>Pos</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700 }}>Participante</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>Puntos</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>Plenos (+3)</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>Aciertos (+1)</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>Efectividad</th>
                    <th style={{ padding: '10px 14px', color: 'var(--tx-3)', fontWeight: 700, textAlign: 'center' }}>Picks</th>
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
                            {isCurrentUser && <span className="badge gold" style={{ fontSize: 9 }}>Tú</span>}
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
        <p className="muted">Cargando quiniela…</p>
      ) : !visible.length ? (
        <Empty
          icon="trophy"
          title={activeTab === 'predict' ? 'Sin partidos para pronosticar' : 'Sin partidos terminados'}
          text={
            activeTab === 'predict'
              ? 'Cuando haya calendario pendiente aparecerá aquí.'
              : 'Cuando se jueguen partidos verás los resultados aquí.'
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


