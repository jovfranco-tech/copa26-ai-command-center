import { useMemo, useState, useEffect } from 'react';
import { Icon, Pill } from '@worldcup/ui';
import { ANALYST_DISCLAIMER } from '@worldcup/shared';
import { useMatches, usePlayers, useStandings, useTeams, useVenues } from '@/hooks';
import { useVoiceInput, useAudioRecording, usePdfUpload } from '@/hooks/useAnalystInput';
import { buildAnalystAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from '@/lib/analyst';
import { askAI, buildAIContext, type AIResult } from '@/lib/aiClient';
import { clearAIMemory, createAIMemoryRecord, entityMemory, getMemoryStats, readAIMemory, saveAIMemoryRecord, type AIMemoryRecord } from '@/lib/aiMemory';
import { listenCloudAIInsights, saveCloudAIInsight } from '@/lib/aiCloudMemory';
import { useFavorites } from '@/store/favorites';
import { usePreferences } from '@/store/preferences';
import { usePool } from '@/store/pool';
import { normalizePoolGroupId } from '@/lib/api';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  buildDayBrief,
  buildPickChangeHints,
  buildPoolDiagnostics,
  buildRecommendedPicks,
  comparePickStrategies,
  evaluateAIStrategyOutcomes,
  recommendPick,
} from '@/lib/opsIntelligence';
import {
  AnalystChart,
  parseAIAnswer,
  AIMemoryPanel,
  AIActionPanel,
  PendingNativeActionPanel,
  StructuredAnswerPanel,
  CitationGrid,
  DailyBriefPanel,
  AIQualityHistory,
  EntityInsightsPanel,
  HawkEyePitch,
  PressRoom,
  type NativeAIAction,
  type PendingNativeAction,
} from '@/components/analyst';

type Ctx = 'tournament' | 'match' | 'team' | 'player' | 'hawkeye' | 'pressroom';

const CTX_ES: Record<Ctx, string> = {
  tournament: 'Torneo',
  match: 'Partido',
  team: 'Selección',
  player: 'Jugador',
  hawkeye: 'Halcón IA',
  pressroom: 'Prensa IA',
};

export function Analyst({ ctx: ctxProp, id: idProp }: { ctx?: string; id?: string }) {
  const { data: teamsData } = useTeams();
  const { data: playersData } = usePlayers();
  const { data: matchData } = useMatches();
  const { data: venuesData } = useVenues();
  const { data: standings } = useStandings();

  const [leaderName, setLeaderName] = useState<string>('');

  useEffect(() => {
    const matchItems = matchData?.items ?? [];
    if (!matchItems.length) return;

    const unsubscribe = onSnapshot(
      collection(db, 'poolPicks'),
      (snapshot) => {
        let maxPoints = -1;
        let topUser = '';

        const playedMatches = matchItems.filter((m) => m.status === 'FT');

        snapshot.forEach((docSnap) => {
          const name = docSnap.id;
          const docData = docSnap.data();
          const picks = docData.picks || {};

          let points = 0;
          for (const m of playedMatches) {
            const pick = picks[m.id];
            if (!pick || !pick.outcome) continue;

            const realHome = m.homeGoals ?? 0;
            const realAway = m.awayGoals ?? 0;

            let realOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (realHome > realAway) realOutcome = 'home';
            else if (realHome < realAway) realOutcome = 'away';

            const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
            const isOutcomeCorrect = pick.outcome === realOutcome;

            if (isExact) {
              points += 3;
            } else if (isOutcomeCorrect) {
              points += 1;
            }
          }

          if (points > maxPoints) {
            maxPoints = points;
            topUser = name;
          }
        });

        if (topUser) {
          setLeaderName(topUser);
        }
      },
      (error) => {
        console.error('Firestore onSnapshot in Analyst error:', error);
      }
    );

    return () => unsubscribe();
  }, [matchData]);

  const dynamicSuggestedQuestions = useMemo(() => {
    const list = [...SUGGESTED_QUESTIONS];
    const matchItems = matchData?.items ?? [];
    
    // Find the last finished match
    const playedMatches = matchItems
      .filter((m) => m.status === 'FT')
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

    if (playedMatches.length > 0) {
      const lastMatch = playedMatches[0];
      const hName = teamsData?.items.find((t) => t.code === lastMatch.home)?.name ?? lastMatch.home;
      const aName = teamsData?.items.find((t) => t.code === lastMatch.away)?.name ?? lastMatch.away;
      
      // Inject dynamic questions about the last match
      list[2] = `¿Qué análisis táctico nos dejas del último ${hName} vs ${aName}?`;
      list[3] = `¿Cuál es el balance ofensivo y posesión de ${hName}?`;
    }

    if (leaderName) {
      // Inject dynamic question about the leaderboard trend
      list[4] = `¿Quién va ganando la quiniela familiar y cómo rinde el puntero ${leaderName}?`;
    }

    return list;
  }, [matchData, teamsData, leaderName]);

  const [ctx, setCtx] = useState<Ctx>((ctxProp as Ctx) ?? 'tournament');
  const [id, setId] = useState<string>(idProp ?? '');
  const [scanHomeTeam, setScanHomeTeam] = useState<string>('México');
  const [scanAwayTeam, setScanAwayTeam] = useState<string>('Argentina');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usedAI, setUsedAI] = useState(false);
  const [lastAiMeta, setLastAiMeta] = useState<AIResult['meta'] | null>(null);
  const [pendingNativeAction, setPendingNativeAction] = useState<PendingNativeAction | null>(null);
  const [memory, setMemory] = useState<AIMemoryRecord[]>(() => readAIMemory());
  const [cloudMemory, setCloudMemory] = useState<AIMemoryRecord[]>([]);
  const [cloudMemoryStatus, setCloudMemoryStatus] = useState<'syncing' | 'synced' | 'error'>('syncing');
  const role = usePreferences((s) => s.role);
  const pool = usePool();
  const poolGroupId = normalizePoolGroupId(pool.groupId);
  const memoryEntityType = ctx === 'hawkeye' || ctx === 'pressroom' ? 'tournament' : ctx;
  const memoryEntityId = memoryEntityType === 'tournament' ? undefined : id;
  const combinedMemory = useMemo(() => {
    const byId = new Map<string, AIMemoryRecord>();
    for (const record of [...cloudMemory, ...memory]) byId.set(record.id, record);
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [cloudMemory, memory]);
  const focusedMemory = useMemo(
    () => entityMemory(combinedMemory, memoryEntityType, memoryEntityId).slice(0, 4),
    [combinedMemory, memoryEntityType, memoryEntityId],
  );
  const memStats = useMemo(() => getMemoryStats(), [memory]);

  useEffect(() => {
    setCloudMemoryStatus('syncing');
    const unsubscribe = listenCloudAIInsights(
      poolGroupId,
      (records) => {
        setCloudMemory(records);
        setCloudMemoryStatus('synced');
      },
      (error) => {
        console.error('AI cloud memory sync error:', error);
        setCloudMemoryStatus('error');
      },
    );
    return () => unsubscribe();
  }, [poolGroupId]);

  const [attachedPdf, setAttachedPdf] = useState<{ name: string; data: string } | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<{ name: string; data: string } | null>(null);

  // Voice/Audio/PDF input via extracted hooks
  const pdfUpload = usePdfUpload();
  const audioRecording = useAudioRecording();
  const voiceInput = useVoiceInput((transcript) => setQuestion(transcript));

  // Sync hook state with local aliases for compatibility
  const handlePdfUpload = pdfUpload.handleUpload;
  const recordingAudio = audioRecording.recording;
  const startAudioRecording = audioRecording.startRecording;
  const stopAudioRecording = audioRecording.stopRecording;
  const listening = voiceInput.listening;
  const toggleSpeech = voiceInput.toggleSpeech;

  // Sync hook attachments into local state (maintains existing data flow)
  useEffect(() => {
    if (pdfUpload.attachment) {
      setAttachedPdf(pdfUpload.attachment);
      pdfUpload.clearAttachment();
    }
  }, [pdfUpload.attachment]);

  useEffect(() => {
    if (audioRecording.attachment) {
      setAttachedAudio(audioRecording.attachment);
      audioRecording.clearAttachment();
    }
  }, [audioRecording.attachment]);

  const commitAnswer = (
    q: string,
    next: AnalystAnswer,
    mode: 'remote' | 'local' | 'simulation',
    meta?: AIResult['meta'] | null,
  ) => {
    setUsedAI(mode !== 'local');
    setLastAiMeta(meta ?? null);
    setAnswer(next);
    const record = createAIMemoryRecord({
      question: q,
      answer: next.text,
      mode,
      context: CTX_ES[ctx],
      sources: next.sources,
      confidence: meta?.confidence ?? (mode === 'local' ? 'Alta local' : 'Media'),
      model: meta?.model,
      tools: meta?.tools,
      entityType: memoryEntityType,
      entityId: memoryEntityId,
      structured: next.structured,
      citations: next.citations,
    });
    setMemory(saveAIMemoryRecord(record));
    saveCloudAIInsight(poolGroupId, record).catch((error) => {
      console.error('Failed to save cloud AI insight:', error);
      setCloudMemoryStatus('error');
    });
  };

  const ask = async (qOverride?: string) => {
    const q = qOverride ?? question;
    if (!q.trim() || busy) return;
    if (qOverride) setQuestion(qOverride);

    const data = {
      teams: teamsData?.items ?? [],
      players: playersData?.items ?? [],
      matches: matchData?.items ?? [],
      venues: venuesData?.items ?? [],
      standings: standings?.groups ?? {},
    };
    const cid = ctx === 'tournament' ? undefined : id;

    // Always have the grounded local answer ready as a fallback.
    const local = buildAnalystAnswer({
      question: q,
      ctx: (ctx === 'hawkeye' || ctx === 'pressroom') ? 'tournament' : ctx,
      id: cid,
      ...data,
    });

    const contextText = buildAIContext(ctx, cid, data);
    if (role === 'guest') {
      commitAnswer(q, { ...local, sources: [...local.sources, 'modo invitado local'] }, 'local', {
        provider: 'local',
        confidence: 'Alta local',
        contextChars: contextText.length,
        tools: ['calendario', 'partidos', 'selecciones', 'jugadores', 'sedes'],
      });
      setAttachedPdf(null);
      setAttachedAudio(null);
      return;
    }

    setBusy(true);
    setStreamingText('');
    const ai = await askAI(
      q,
      contextText,
      attachedPdf || undefined,
      attachedAudio || undefined,
      (partial) => setStreamingText(partial),
    );
    setBusy(false);
    setStreamingText('');
    setAttachedPdf(null);
    setAttachedAudio(null);

    if (ai.ok && ai.answer) {
      commitAnswer(
        q,
        {
          text: ai.answer,
          sources: ai.meta?.sources ?? ['IA', 'datos locales'],
          structured: local.structured,
          citations: local.citations,
        },
        'remote',
        ai.meta,
      );
    } else {
      const reason = ai.reason === 'rate-limit' ? `limite IA ${ai.retryAfter ?? ''}s` : 'fallback local';
      commitAnswer(q, { ...local, sources: [...local.sources, reason] }, 'local', ai.meta);
    }
  };

  const parsed = useMemo(() => {
    if (!answer) return null;
    return parseAIAnswer(answer.text);
  }, [answer]);

  const favs = useFavorites();
  const tacticalNotes = favs.tacticalNotes;

  const isNoteSaved = useMemo(() => {
    if (!answer || !parsed) return false;
    const notesList = tacticalNotes ?? [];
    return notesList.some((n) => n.query === question && n.response === parsed.text);
  }, [answer, parsed, tacticalNotes, question]);

  const handleSaveNote = () => {
    if (!answer || !parsed || isNoteSaved) return;
    favs.addTacticalNote({
      query: question,
      response: parsed.text,
      chart: parsed.chart,
    });
    if ('vibrate' in navigator) navigator.vibrate([15, 5, 15]);
  };

  const applyPendingNativeAction = () => {
    if (!pendingNativeAction) return;
    if (pendingNativeAction.picks && Object.keys(pendingNativeAction.picks).length) {
      pool.importPicks(pendingNativeAction.picks);
    }
    commitAnswer(
      pendingNativeAction.question,
      pendingNativeAction.answer,
      'simulation',
      pendingNativeAction.meta,
    );
    setPendingNativeAction(null);
  };

  const runNativeAction = (action: NativeAIAction) => {
    const matchItems = matchData?.items ?? [];
    const teamItems = teamsData?.items ?? [];
    const teamRanking = new Map(teamItems.map((team) => [team.code, team.ranking ?? 80]));
    const upcomingMatches = matchItems
      .filter((m) => m.status === 'UPCOMING')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const diagnostics = buildPoolDiagnostics(matchItems, pool.picks, [], pool.playerName);
    const dayBrief = buildDayBrief(matchItems, teamItems, pool.picks);

    if (action === 'conservative-pool') {
      const picks = buildRecommendedPicks(matchItems, teamItems, 24);
      const nextAnswer: AnalystAnswer = {
        text: `Preparé ${Object.keys(picks).length} picks pendientes con una lógica conservadora: ranking más fuerte gana por margen corto; partidos parejos quedan 1-1. Revisa la previsualización antes de aplicarlos.`,
        sources: ['ranking local', 'calendario', 'quiniela'],
        structured: {
          prediction: 'Quiniela conservadora preparada para próximos partidos.',
          risk: 'No considera lesiones, convocatoria final ni forma reciente.',
          confidence: 'Media',
          dataUsed: ['Ranking de selecciones', 'Calendario pendiente'],
          ignoredData: ['Noticias', 'lesiones', 'once inicial'],
          rationale: 'Los picks se generan por diferencia de ranking y marcadores de baja varianza.',
          nextAction: 'Aplicar solo si quieres sobrescribir/llenar picks actuales.',
          quality: {
            score: 76,
            label: 'Propuesta local revisable',
            flags: ['No usa llamada remota', 'Requiere confirmación antes de aplicar'],
            checkedAt: new Date().toISOString(),
          },
        },
        citations: [
          {
            label: 'Picks preparados',
            value: `${Object.keys(picks).length} próximos partidos`,
            source: 'Motor local de quiniela conservadora',
            date: new Date().toISOString().slice(0, 10),
            confidence: 'Media',
          },
        ],
      };
      setPendingNativeAction({
        id: action,
        title: 'Previsualización de quiniela conservadora',
        detail: `${Object.keys(picks).length} picks listos. No se aplican hasta confirmar.`,
        picks,
        question: 'Acción IA: rellenar quiniela conservadora',
        answer: nextAnswer,
        meta: { provider: 'local-action', confidence: 'Media', tools: ['ranking', 'quiniela'] },
      });
      setAnswer(nextAnswer);
      setUsedAI(true);
      setLastAiMeta({ provider: 'local-action', confidence: 'Media', tools: ['ranking', 'quiniela'] });
      return;
    }

    if (action === 'day-brief') {
      const next = upcomingMatches[0];
      const rec = next ? recommendPick(next, teamItems) : null;
      commitAnswer(
        'Acción IA: resumen operativo del día',
        {
          text: `${dayBrief.title}. ${dayBrief.highlights.join(' ')} Siguiente acción: ${dayBrief.nextAction}`,
          sources: ['calendario', 'quiniela', 'ranking local'],
          structured: {
            prediction: rec ? `Pick sugerido para el siguiente juego: ${rec.label}.` : dayBrief.title,
            risk: rec?.risk ?? 'Sin partido pendiente para proyectar.',
            confidence: rec?.confidence ?? 'Alta local',
            dataUsed: ['Partidos pendientes', 'picks locales', 'ranking de selecciones'],
            ignoredData: ['Convocatorias finales', 'lesiones', 'alineaciones confirmadas'],
            rationale: rec?.rationale ?? 'El resumen prioriza el siguiente partido y huecos de quiniela.',
            nextAction: dayBrief.nextAction,
            quality: {
              score: rec?.confidence === 'Alta' ? 86 : 78,
              label: 'Brief operativo',
              flags: ['Actualizado desde datos locales', 'No requiere llamada remota'],
              checkedAt: new Date().toISOString(),
            },
          },
          citations: dayBrief.highlights.map((highlight, index) => ({
            label: `Señal ${index + 1}`,
            value: highlight,
            source: 'Motor operativo local',
            date: new Date().toISOString().slice(0, 10),
            confidence: index === 0 ? 'Alta' : 'Media',
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: rec?.confidence ?? 'Alta local', tools: ['calendario', 'quiniela', 'ranking'] },
      );
      return;
    }

    if (action === 'compare-family') {
      const leader = leaderName || 'sin líder todavía';
      commitAnswer(
        'Acción IA: comparar mi quiniela con la familia',
        {
          text: `${pool.playerName || 'Tu perfil'} tiene ${diagnostics.pickedPending}/${diagnostics.totalPending} ganadores y ${diagnostics.completeScores}/${diagnostics.totalPending} marcadores completos. Líder familiar actual: ${leader}. ${diagnostics.familySignal}`,
          sources: ['quiniela local', 'tabla familiar'],
          structured: {
            prediction: diagnostics.pickedPending ? 'Ya hay base para competir en la tabla familiar.' : 'Falta capturar picks antes de comparar rendimiento.',
            risk: 'La comparación será más útil cuando existan resultados reales.',
            confidence: 'Alta local',
            dataUsed: ['Picks locales', 'grupo familiar', 'leaderboard Firestore'],
            ignoredData: ['Picks de otros miembros no sincronizados'],
            rationale: 'La acción compara cobertura de picks y líder visible sin leer datos sensibles fuera del grupo.',
            nextAction: diagnostics.recommendedAction,
            quality: {
              score: 90,
              label: 'Comparación local',
              flags: ['Basado en Firestore si hay sincronización', 'Sin resultados reales aún'],
              checkedAt: new Date().toISOString(),
            },
          },
        },
        'simulation',
        { provider: 'local-action', confidence: 'Alta local', tools: ['quiniela', 'leaderboard'] },
      );
      return;
    }

    if (action === 'audit-picks') {
      const fixes: Record<string, { homeGoals?: number; awayGoals?: number; outcome?: string }> = {};
      for (const match of upcomingMatches.slice(0, 24)) {
        const pick = pool.picks[match.id];
        if (!pick?.outcome) continue;
        if (pick.homeGoals != null && pick.awayGoals != null) continue;
        if (pick.outcome === 'draw') fixes[match.id] = { ...pick, homeGoals: 1, awayGoals: 1 };
        if (pick.outcome === 'home') fixes[match.id] = { ...pick, homeGoals: 1, awayGoals: 0 };
        if (pick.outcome === 'away') fixes[match.id] = { ...pick, homeGoals: 0, awayGoals: 1 };
      }
      const nextAnswer: AnalystAnswer = {
        text: Object.keys(fixes).length
          ? `Detecté ${diagnostics.missingScore} marcadores incompletos y propuse cerrar ${Object.keys(fixes).length} con marcadores bajos coherentes con el ganador elegido.`
          : `No encontré marcadores incompletos para reparar. Cobertura actual: ${diagnostics.coveragePct}% ganadores y ${diagnostics.scorePct}% marcadores.`,
        sources: ['quiniela local', 'reglas de cierre'],
        structured: {
          prediction: Object.keys(fixes).length ? 'Picks listos para reparación con marcador mínimo.' : 'Quiniela sin reparaciones automáticas necesarias.',
          risk: 'Los marcadores bajos son seguros pero pueden perder plenos si el partido se abre.',
          confidence: 'Alta local',
          dataUsed: ['Picks activos', 'partidos pendientes', 'reglas de marcador'],
          ignoredData: ['Táctica específica del rival', 'momento competitivo del grupo'],
          rationale: 'La auditoría no cambia ganadores existentes; solo completa goles faltantes con una regla coherente.',
          nextAction: Object.keys(fixes).length ? 'Aplicar reparación si estás de acuerdo.' : diagnostics.recommendedAction,
          quality: {
            score: 88,
            label: 'Auditoría determinística',
            flags: ['No sobrescribe picks completos', 'Solo completa goles faltantes'],
            checkedAt: new Date().toISOString(),
          },
        },
        citations: [
          {
            label: 'Reparaciones propuestas',
            value: `${Object.keys(fixes).length} marcadores`,
            source: 'Auditor de quiniela local',
            date: new Date().toISOString().slice(0, 10),
            confidence: 'Alta',
          },
        ],
      };
      if (Object.keys(fixes).length) {
        setPendingNativeAction({
          id: action,
          title: 'Previsualización de auditoría',
          detail: `${Object.keys(fixes).length} marcadores se completarían sin cambiar ganadores.`,
          picks: fixes as Parameters<typeof pool.importPicks>[0],
          question: 'Acción IA: auditar picks incompletos',
          answer: nextAnswer,
          meta: { provider: 'local-action', confidence: 'Alta local', tools: ['quiniela', 'auditor'] },
        });
      } else {
        setPendingNativeAction(null);
      }
      setAnswer(nextAnswer);
      setUsedAI(true);
      setLastAiMeta({ provider: 'local-action', confidence: 'Alta local', tools: ['quiniela', 'auditor'] });
      return;
    }

    if (action === 'family-learning') {
      commitAnswer(
        'Acción IA: aprender estilo familiar',
        {
          text: `Lectura de estilo: ${diagnostics.styleLabel}. ${diagnostics.styleDetail} Señal familiar: ${diagnostics.familySignal}`,
          sources: ['picks locales', 'memoria IA', 'grupo familiar'],
          structured: {
            prediction: `Tu perfil operativo actual es ${diagnostics.styleLabel.toLowerCase()}.`,
            risk: 'El aprendizaje mejora cuando haya más familiares sincronizados y resultados reales.',
            confidence: diagnostics.pickedPending >= 8 ? 'Media' : 'Baja',
            dataUsed: ['Patrón de marcadores', 'cobertura de picks', 'memoria compartida'],
            ignoredData: ['Picks no sincronizados de otros dispositivos', 'sesgos personales no observados'],
            rationale: 'La app clasifica estilo por promedio de goles, frecuencia de empates y cobertura de quiniela.',
            nextAction: diagnostics.recommendedAction,
            quality: {
              score: diagnostics.pickedPending >= 8 ? 79 : 62,
              label: 'Aprendizaje temprano',
              flags: ['Se recalibra con cada pick', 'Más fuerte tras resultados reales'],
              checkedAt: new Date().toISOString(),
            },
          },
        },
        'simulation',
        { provider: 'local-action', confidence: diagnostics.pickedPending >= 8 ? 'Media' : 'Baja', tools: ['memoria', 'quiniela'] },
      );
      return;
    }

    if (action === 'compare-strategies') {
      const strategies = comparePickStrategies(matchItems, teamItems, 6);
      const lines = strategies.map(
        (strategy) =>
          `${strategy.label}: ${strategy.picks.slice(0, 3).map((pick) => `${pick.matchLabel} ${pick.prediction}`).join('; ')}`,
      );
      commitAnswer(
        'Acción IA: comparar estrategias de quiniela',
        {
          text: strategies.length
            ? `Comparé tres estilos para los próximos partidos. ${lines.join(' ')}`
            : 'No hay partidos pendientes para comparar estrategias.',
          sources: ['ranking local', 'calendario', 'motor de estrategias'],
          structured: {
            prediction: 'La estrategia conservadora queda como default; agresiva y contraria sirven para remontar o diferenciarte.',
            risk: 'Las estrategias alternativas necesitan revisar alineaciones y noticias reales antes del cierre.',
            confidence: 'Media',
            dataUsed: ['Ranking de selecciones', 'calendario pendiente', 'reglas de quiniela'],
            ignoredData: ['Lesiones', 'alineaciones confirmadas', 'mercados de apuesta'],
            rationale: 'Se comparan tres modelos locales con distinto apetito de riesgo para que el usuario elija contexto, no solo un pick único.',
            nextAction: 'Usar conservadora como base y revisar contraria solo en cruces de baja confianza.',
            quality: {
              score: 82,
              label: 'Comparador multi-estrategia',
              flags: ['Sin llamada remota', 'No aplica cambios automáticamente'],
              checkedAt: new Date().toISOString(),
            },
          },
          citations: strategies.map((strategy) => ({
            label: strategy.label,
            value: `${strategy.picks.length} picks · confianza ${strategy.confidence}`,
            source: strategy.summary,
            date: new Date().toISOString().slice(0, 10),
            confidence: strategy.confidence,
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: 'Media', tools: ['ranking', 'estrategias', 'quiniela'] },
      );
      return;
    }

    if (action === 'ai-scorecard') {
      const scorecard = evaluateAIStrategyOutcomes(matchItems, teamItems);
      commitAnswer(
        'Acción IA: scorecard de estrategias',
        {
          text: `${scorecard.summary} Mejor lectura actual: ${scorecard.bestLabel}. ${scorecard.strategies.map((row) => `${row.label}: ${row.points} pts, ${row.efficiency}%`).join(' · ')}`,
          sources: ['resultados reales cuando existan', 'motor local de estrategias'],
          structured: {
            prediction: scorecard.played ? `Estrategia líder: ${scorecard.bestLabel}.` : 'La evaluación está lista pero aún no hay resultados finales.',
            risk: scorecard.played ? 'El tamaño de muestra inicial puede ser pequeño.' : 'No se inventan aciertos antes de partidos oficiales.',
            confidence: scorecard.played >= 8 ? 'Alta local' : scorecard.played ? 'Media' : 'Alta local',
            dataUsed: ['Marcadores finales', 'reglas de puntaje', 'picks simulados por estrategia'],
            ignoredData: ['Partidos sin marcador final'],
            rationale: 'Cada estrategia se vuelve a proyectar contra partidos finalizados y se puntúa como quiniela: pleno +3, ganador +1.',
            nextAction: scorecard.played ? 'Revisar estrategia líder antes de rellenar nuevos picks.' : 'Esperar resultados o conectar feed real.',
            quality: {
              score: scorecard.played ? 86 : 78,
              label: 'Scorecard activable',
              flags: scorecard.played ? ['Basado en FT reales'] : ['Sin resultados oficiales todavía', 'No inventa métricas'],
              checkedAt: new Date().toISOString(),
            },
          },
          citations: scorecard.strategies.map((row) => ({
            label: row.label,
            value: `${row.points} pts · ${row.exactScores} plenos · ${row.outcomeHits} ganadores`,
            source: 'Scorecard local de IA',
            date: new Date().toISOString().slice(0, 10),
            confidence: scorecard.played ? 'Media' : 'Alta',
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: scorecard.played ? 'Media' : 'Alta local', tools: ['scorecard', 'resultados', 'estrategias'] },
      );
      return;
    }

    if (action === 'change-radar') {
      const hints = buildPickChangeHints(matchItems, teamItems, pool.picks, 6);
      commitAnswer(
        'Acción IA: explicar cambios de recomendación',
        {
          text: hints.length
            ? `Encontré ${hints.length} picks donde tu selección difiere del modelo local. ${hints.map((hint) => `${hint.matchLabel}: tienes ${hint.current}, modelo ${hint.recommended}; ${hint.rationale}`).join(' ')}`
            : 'No detecté picks actuales que difieran de la recomendación local, o todavía faltan picks para comparar.',
          sources: ['quiniela local', 'ranking local', 'motor de recomendación'],
          structured: {
            prediction: hints.length ? 'Hay diferencias revisables antes del cierre.' : 'No hay cambios de criterio pendientes.',
            risk: 'Una diferencia no significa error; puede ser una decisión de riesgo familiar.',
            confidence: hints.length ? 'Media' : 'Alta local',
            dataUsed: ['Picks actuales', 'ranking', 'partidos pendientes'],
            ignoredData: ['Noticias', 'alineaciones', 'lesiones'],
            rationale: 'El radar compara tu pick visible contra la recomendación conservadora actual y explica el motivo del cambio.',
            nextAction: hints.length ? 'Revisar diferencias de baja confianza antes de compartir.' : diagnostics.recommendedAction,
            quality: {
              score: hints.length ? 80 : 88,
              label: 'Radar de cambios',
              flags: ['No modifica picks', 'Explica diferencias visibles'],
              checkedAt: new Date().toISOString(),
            },
          },
          citations: hints.map((hint) => ({
            label: hint.matchLabel,
            value: `${hint.current} -> ${hint.recommended}`,
            source: hint.rationale,
            date: new Date().toISOString().slice(0, 10),
            confidence: 'Media',
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: hints.length ? 'Media' : 'Alta local', tools: ['quiniela', 'radar-cambios'] },
      );
      return;
    }

    const uncertain = upcomingMatches
      .map((match) => ({
        match,
        diff: Math.abs((teamRanking.get(match.home) ?? 80) - (teamRanking.get(match.away) ?? 80)),
      }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);
    commitAnswer(
      'Acción IA: detectar partidos inciertos',
      {
        text: uncertain.length
          ? `Partidos más inciertos por ranking cercano: ${uncertain.map(({ match, diff }) => `${match.home}-${match.away} (dif. ${diff})`).join(', ')}.`
          : 'No hay partidos pendientes para analizar incertidumbre.',
        sources: ['ranking local', 'calendario'],
        structured: {
          prediction: 'Los cruces con ranking más cercano son candidatos a empate o marcador corto.',
          risk: 'El ranking no captura lesiones, localía real, rotaciones ni presión del grupo.',
          confidence: 'Media',
          dataUsed: ['Ranking de selecciones', 'partidos pendientes'],
          ignoredData: ['Forma reciente', 'alineaciones', 'probabilidades de mercado'],
          rationale: 'La incertidumbre se estima por cercanía de ranking; menor diferencia implica menor separación previa.',
          nextAction: 'Revisar esos partidos antes de aceptar picks automáticos.',
          quality: {
            score: 74,
            label: 'Estimación heurística',
            flags: ['No sustituye análisis humano', 'Sin feed vivo de lesiones'],
            checkedAt: new Date().toISOString(),
          },
        },
      },
      'simulation',
      { provider: 'local-action', confidence: 'Media', tools: ['ranking', 'calendario'] },
    );
  };

  return (
    <div className="page-fade">
      <div className="grid analyst-layout">
        <div className="grid">
          <div className="card brief">
            <div className="card-hd">
              <span
                style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--gold-soft)', color: 'var(--gold)' }}
              >
                <Icon name="ai" size={15} />
              </span>
              <h3>Analista de partidos</h3>
            </div>
              <div className="card-pad brief-body">
                <div className="row gap-6 wrap" style={{ marginBottom: 10 }}>
                {(['tournament', 'match', 'team', 'player', 'hawkeye', 'pressroom'] as Ctx[]).map((c) => (
                  <Pill
                    key={c}
                    on={ctx === c}
                    onClick={() => {
                      setCtx(c);
                      setId('');
                    }}
                  >
                    {CTX_ES[c]}
                  </Pill>
                ))}
              </div>

              {ctx !== 'tournament' && ctx !== 'hawkeye' && ctx !== 'pressroom' && (
                <select
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="pill"
                  style={{ color: 'var(--tx)', marginBottom: 10, maxWidth: 320 }}
                >
                  <option value="">Elige {ctx === 'player' ? 'un jugador' : ctx === 'team' ? 'una selección' : 'un partido'}…</option>
                  {ctx === 'match' &&
                    (matchData?.items ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.home} vs {m.away} · {m.date}
                      </option>
                    ))}
                  {ctx === 'team' &&
                    (teamsData?.items ?? []).map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  {ctx === 'player' &&
                    (playersData?.items ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.team})
                      </option>
                    ))}
                </select>
              )}

              {ctx === 'pressroom' && (
                <div style={{ marginBottom: 10 }}>
                  <select
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="pill"
                    style={{ color: 'var(--tx)', marginBottom: 10, maxWidth: 320 }}
                  >
                    <option value="">Elige un partido para la Rueda de Prensa…</option>
                    {(matchData?.items ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.home} vs {m.away} · {m.date}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ai-native-strip">
                <div>
                  <span className="mono-label">Rol activo</span>
                  <strong>{role === 'admin' ? 'Admin' : role === 'family' ? 'Familia' : 'Invitado local'}</strong>
                </div>
                <div>
                  <span className="mono-label">Herramientas</span>
                  <strong>Datos · Adjuntos · Voz · Memoria</strong>
                </div>
                <div>
                  <span className="mono-label">Consumo IA</span>
                  <strong>{role === 'guest' ? 'Bloqueado remoto' : 'Limitado por sesión'}</strong>
                </div>
              </div>

              <AIActionPanel
                groupId={poolGroupId}
                cloudStatus={cloudMemoryStatus}
                onRun={runNativeAction}
              />

              <PendingNativeActionPanel
                pending={pendingNativeAction}
                onApply={applyPendingNativeAction}
                onCancel={() => setPendingNativeAction(null)}
              />

              {ctx === 'hawkeye' && (
                <div className="row gap-8" style={{ marginBottom: 12, maxWidth: 320 }}>
                  <select
                    value={scanHomeTeam}
                    onChange={(e) => setScanHomeTeam(e.target.value)}
                    className="pill"
                    style={{ color: 'var(--tx)', flex: 1 }}
                  >
                    <option value="">Local…</option>
                    {(teamsData?.items ?? []).map((t) => (
                      <option key={t.code} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <span className="muted" style={{ alignSelf: 'center' }}>vs</span>
                  <select
                    value={scanAwayTeam}
                    onChange={(e) => setScanAwayTeam(e.target.value)}
                    className="pill"
                    style={{ color: 'var(--tx)', flex: 1 }}
                  >
                    <option value="">Visita…</option>
                    {(teamsData?.items ?? []).map((t) => (
                      <option key={t.code} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {ctx === 'hawkeye' && (
                <HawkEyePitch
                  homeTeam={scanHomeTeam}
                  awayTeam={scanAwayTeam}
                  simulating={busy}
                  onSimulate={(report) => {
                    commitAnswer(
                      `Simulación táctica ${scanHomeTeam} vs ${scanAwayTeam}`,
                      { text: report, sources: ['IA (Ojo de Halcón)', 'datos tácticos'] },
                      'simulation',
                      { provider: 'local-simulation', confidence: 'Media', tools: ['pizarra táctica'] },
                    );
                  }}
                />
              )}

              {ctx === 'pressroom' && (
                <PressRoom
                  matchId={id}
                  matches={matchData?.items ?? []}
                  answering={busy}
                  onAnswer={(report) => {
                    commitAnswer(
                      'Sala de prensa',
                      { text: report, sources: ['Prensa deportiva', 'opinión táctica'] },
                      'simulation',
                      { provider: 'local-simulation', confidence: 'Media', tools: ['preguntas guiadas'] },
                    );
                  }}
                />
              )}

              {ctx !== 'hawkeye' && ctx !== 'pressroom' && (
                <>
                  <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
                    {attachedPdf && (
                      <div
                        className="row gap-6 align-center"
                        style={{
                          background: 'var(--bg-1)',
                          border: '1px solid var(--gold-line)',
                          padding: '4px 10px',
                          borderRadius: 'var(--r-sm)',
                          fontSize: 12,
                          color: 'var(--tx)',
                          width: 'fit-content',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Icon name="stats" size={11} style={{ color: 'var(--gold)' }} />
                        <span className="nowrap" style={{ fontWeight: 600 }}>{attachedPdf.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedPdf(null)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 2,
                            marginLeft: 4
                          }}
                          title="Quitar PDF"
                        >
                          <Icon name="close" size={11} />
                        </button>
                      </div>
                    )}

                    {attachedAudio && (
                      <div
                        className="row gap-6 align-center animate-fade-in"
                        style={{
                          background: 'var(--bg-1)',
                          border: '1px solid var(--gold-line)',
                          padding: '4px 10px',
                          borderRadius: 'var(--r-sm)',
                          fontSize: 12,
                          color: 'var(--tx)',
                          width: 'fit-content',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <span className="dot pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginRight: 2, display: 'inline-block' }} />
                        <span className="nowrap" style={{ fontWeight: 600 }}>🎤 {attachedAudio.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedAudio(null)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 2,
                            marginLeft: 4
                          }}
                          title="Quitar audio"
                        >
                          <Icon name="close" size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <form
                    className="row gap-8"
                    onSubmit={(e) => {
                      e.preventDefault();
                      ask();
                    }}
                  >
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                      <input
                        className="searchbox"
                        style={{ flex: 1, marginLeft: 0, paddingRight: voiceInput.supported ? '94px' : '68px' }}
                        placeholder={recordingAudio ? "Grabando tu voz táctica... Presiona el micrófono para finalizar" : "Escribe una pregunta táctica..."}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={recordingAudio}
                      />

                      <button
                        type="button"
                        onClick={recordingAudio ? stopAudioRecording : startAudioRecording}
                        style={{
                          position: 'absolute',
                          right: voiceInput.supported ? '64px' : '36px',
                          background: 'transparent',
                          border: 'none',
                          color: recordingAudio ? '#ef4444' : attachedAudio ? 'var(--gold)' : 'var(--tx-3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '50%',
                          transition: 'all 0.2s ease',
                          animation: recordingAudio ? 'pulse-microphone 1s infinite alternate' : 'none',
                        }}
                        title={recordingAudio ? 'Detener grabación de audio' : 'Grabar nota de voz táctica para Gemini'}
                      >
                        <Icon name="mic" size={14} style={{ color: recordingAudio ? '#ef4444' : attachedAudio ? 'var(--gold)' : 'var(--tx-3)' }} />
                      </button>

                      <label
                        style={{
                          position: 'absolute',
                          right: voiceInput.supported ? '36px' : '8px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--tx-3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '50%',
                          transition: 'all 0.2s ease',
                        }}
                        title="Adjuntar reporte táctico (PDF)"
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfUpload}
                          style={{ display: 'none' }}
                        />
                        <Icon name="stats" size={14} style={{ color: attachedPdf ? 'var(--gold)' : 'var(--tx-3)' }} />
                      </label>

                      {voiceInput.supported && (
                        <button
                          type="button"
                          onClick={toggleSpeech}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: listening ? '#ef4444' : 'var(--gold)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease',
                            animation: listening ? 'pulse-microphone 1s infinite alternate' : 'none',
                          }}
                          title={listening ? 'Escuchando... Haz clic para detener' : 'Preguntar con la voz'}
                        >
                          <Icon name={listening ? 'sparkSmall' : 'ai'} size={18} />
                        </button>
                      )}
                    </div>
                    <button type="submit" className="btn gold" disabled={busy || recordingAudio}>
                      <Icon name={busy ? 'sparkSmall' : 'send'} size={14} /> {busy ? 'Pensando…' : 'Preguntar'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {busy && streamingText && (
            <div className="card card-pad" style={{ borderColor: 'var(--gold-line)' }}>
              <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 10 }}>
                <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
                <span className="mono-label" style={{ margin: 0 }}>
                  Analista IA · escribiendo…
                </span>
                <span className="badge gold">EN VIVO</span>
              </div>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {streamingText.replace(/```json[\s\S]*$/, '').trim()}
                <span style={{ opacity: 0.6 }}>▍</span>
              </p>
            </div>
          )}

          {answer && parsed && (
            <div className="card card-pad">
              <div className="row spread" style={{ marginBottom: 12, alignItems: 'center' }}>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
                  <span className="mono-label" style={{ margin: 0 }}>
                    {usedAI ? 'Analista IA' : 'Analista local'}
                  </span>
                  {usedAI && <span className="badge gold">IA</span>}
                </div>
                
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="btn ghost btn-sm"
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  disabled={isNoteSaved}
                >
                  <Icon name="star" size={11} style={{ color: isNoteSaved ? 'var(--gold)' : 'var(--tx-3)' }} />
                  {isNoteSaved ? 'Guardada' : 'Guardar en Notas'}
                </button>
              </div>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>{parsed.text}</p>

              <StructuredAnswerPanel structured={answer.structured} />
              <CitationGrid citations={answer.citations} />
              
              {parsed.chart && <AnalystChart chart={parsed.chart} />}

              <div className="analyst-source-grid">
                <div>
                  <span className="mono-label">Modo</span>
                  <strong>{usedAI ? (lastAiMeta?.model ?? 'Proveedor IA') : role === 'guest' ? 'Invitado local' : 'Motor local'}</strong>
                </div>
                <div>
                  <span className="mono-label">Datos enviados</span>
                  <strong>{lastAiMeta?.contextChars ? `${lastAiMeta.contextChars} chars` : 'Contexto resumido'}</strong>
                </div>
                <div>
                  <span className="mono-label">Confianza</span>
                  <strong>{lastAiMeta?.confidence ?? (usedAI ? 'Media' : 'Alta local')}</strong>
                </div>
              </div>
              {lastAiMeta?.tools?.length ? (
                <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
                  <span className="mono-label">Herramientas:</span>
                  {lastAiMeta.tools.map((tool) => (
                    <span key={tool} className="cite">{tool}</span>
                  ))}
                </div>
              ) : null}
              
              <div className="row gap-6 wrap" style={{ marginTop: 14 }}>
                <span className="mono-label" style={{ margin: 0 }}>
                  Fuentes:
                </span>
                {answer.sources.map((s) => (
                  <span key={s} className="cite">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mono-label" style={{ marginTop: 12 }}>
                {ANALYST_DISCLAIMER}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Sugeridas</h3>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dynamicSuggestedQuestions.map((s) => (
              <button
                key={s}
                type="button"
                className="btn ghost btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => ask(s)}
              >
                {s}
              </button>
            ))}
            <div className="mono-label" style={{ marginTop: 6 }}>
              {ANALYST_DISCLAIMER}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11 }}>
          <span className="mono-label">Memoria IA</span>
          <div style={{ flex: 1, maxWidth: 120, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${memStats.percentFull}%`, height: '100%', background: memStats.percentFull > 80 ? '#ef4444' : 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: 'var(--tx-3)' }}>{memStats.total}/{60}</span>
        </div>
        <AIMemoryPanel
          records={combinedMemory}
          onReuse={(record) => {
            setQuestion(record.question);
            setAnswer({ text: record.answer, sources: record.sources, structured: record.structured, citations: record.citations });
            setUsedAI(record.mode !== 'local');
            setLastAiMeta({ model: record.model, confidence: record.confidence, tools: record.tools });
          }}
          onClear={() => setMemory(clearAIMemory())}
        />
        <DailyBriefPanel
          matches={matchData?.items ?? []}
          teams={teamsData?.items ?? []}
          picks={pool.picks}
          onRun={() => runNativeAction('day-brief')}
        />
        <AIQualityHistory records={combinedMemory} />
        <EntityInsightsPanel records={focusedMemory} context={CTX_ES[ctx]} />
      </div>
    </div>
  );
}
