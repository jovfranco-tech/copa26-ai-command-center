import { useMemo, useState, useEffect, useRef } from 'react';
import { Icon, Pill } from '@worldcup/ui';
import { useMatches, usePlayers, useStandings, useTeams, useVenues } from '@/hooks';
import { useVoiceInput, useAudioRecording, usePdfUpload } from '@/hooks/useAnalystInput';
import { buildAnalystAnswer, getSuggestedQuestions, type AnalystAnswer } from '@/lib/analyst';
import { useT, useLang } from '@/i18n';
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

const CTX_KEYS: Record<Ctx, string> = {
  tournament: 'aiAnalyst.ctxTournament',
  match: 'aiAnalyst.ctxMatch',
  team: 'aiAnalyst.ctxTeam',
  player: 'aiAnalyst.ctxPlayer',
  hawkeye: 'aiAnalyst.ctxHawkeye',
  pressroom: 'aiAnalyst.ctxPressroom',
};

export function Analyst({ ctx: ctxProp, id: idProp }: { ctx?: string; id?: string }) {
  const t = useT();
  const lang = useLang();
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
      () => {
        // Firestore snapshot error handled silently
      }
    );

    return () => unsubscribe();
  }, [matchData]);

  const dynamicSuggestedQuestions = useMemo(() => {
    const list = getSuggestedQuestions(t);
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
      list[2] = t('aiAnalyst.dynQ3', { home: hName, away: aName });
      list[3] = t('aiAnalyst.dynQ4', { home: hName });
    }

    if (leaderName) {
      // Inject dynamic question about the leaderboard trend
      list[4] = t('aiAnalyst.dynQ5', { leader: leaderName });
    }

    return list;
  }, [matchData, teamsData, leaderName, t]);

  const [ctx, setCtx] = useState<Ctx>((ctxProp as Ctx) ?? 'tournament');
  const [id, setId] = useState<string>(idProp ?? '');
  const [scanHomeTeam, setScanHomeTeam] = useState<string>('México');
  const [scanAwayTeam, setScanAwayTeam] = useState<string>('Argentina');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingProvider, setStreamingProvider] = useState<string | null>(null);
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
  // `memory` is an intentional recompute trigger: getMemoryStats() reads the
  // persisted store, so we want fresh stats whenever the memory list changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memStats = useMemo(() => getMemoryStats(), [memory]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    setCloudMemoryStatus('syncing');
    const unsubscribe = listenCloudAIInsights(
      poolGroupId,
      (records) => {
        setCloudMemory(records);
        setCloudMemoryStatus('synced');
      },
      () => {
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

  // Sync hook attachments into local state (maintains existing data flow).
  // Intentionally keyed only on `.attachment` (the one-shot trigger); clearAttachment
  // is a stable setter and adding the whole hook object would re-run every render.
  useEffect(() => {
    if (pdfUpload.attachment) {
      setAttachedPdf(pdfUpload.attachment);
      pdfUpload.clearAttachment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUpload.attachment]);

  useEffect(() => {
    if (audioRecording.attachment) {
      setAttachedAudio(audioRecording.attachment);
      audioRecording.clearAttachment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      context: t(CTX_KEYS[ctx]),
      sources: next.sources,
      confidence: meta?.confidence ?? (mode === 'local' ? t('aiAnalyst.confHighLocal') : t('sourceBadge.medium')),
      model: meta?.model,
      tools: meta?.tools,
      entityType: memoryEntityType,
      entityId: memoryEntityId,
      structured: next.structured,
      citations: next.citations,
    });
    setMemory(saveAIMemoryRecord(record));
    saveCloudAIInsight(poolGroupId, record).catch(() => {
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
    }, t);

    const contextText = buildAIContext(ctx, cid, data);
    if (role === 'guest') {
      commitAnswer(q, { ...local, sources: [...local.sources, t('aiAnalyst.guestLocalMode')] }, 'local', {
        provider: 'local',
        confidence: t('aiAnalyst.confHighLocal'),
        contextChars: contextText.length,
        tools: [t('aiAnalyst.toolSchedule'), t('aiAnalyst.toolMatches'), t('aiAnalyst.toolTeams'), t('aiAnalyst.toolPlayers'), t('aiAnalyst.toolVenues')],
      });
      setAttachedPdf(null);
      setAttachedAudio(null);
      return;
    }

    setBusy(true);
    setStreamingText('');
    setStreamingProvider(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    // 30s timeout for AI response
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 30000);
    const ai = await askAI(
      q,
      contextText,
      attachedPdf || undefined,
      attachedAudio || undefined,
      (partial) => setStreamingText(partial),
      (meta) => {
        if (meta?.provider) setStreamingProvider(meta.provider);
      },
      abortRef.current.signal,
      memory.map((r) => ({ question: r.question, answer: r.answer })),
    );
    clearTimeout(timeoutId);
    setBusy(false);
    setStreamingText('');
    setStreamingProvider(null);
    setAttachedPdf(null);
    setAttachedAudio(null);

    if (ai.ok && ai.answer) {
      commitAnswer(
        q,
        {
          text: ai.answer,
          sources: ai.meta?.sources ?? [t('aiAnalyst.ai'), t('aiAnalyst.localData')],
          structured: local.structured,
          citations: local.citations,
        },
        'remote',
        ai.meta,
      );
    } else {
      const reason = ai.reason === 'rate-limit' ? t('aiAnalyst.aiLimit', { s: ai.retryAfter ?? '' }) : t('aiAnalyst.localFallback');
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
    const diagnostics = buildPoolDiagnostics(matchItems, pool.picks, [], pool.playerName, t);
    const dayBrief = buildDayBrief(matchItems, teamItems, pool.picks, t);

    if (action === 'conservative-pool') {
      const picks = buildRecommendedPicks(matchItems, teamItems, 24);
      const nextAnswer: AnalystAnswer = {
        text: t('aiAnalyst.naConsText', { n: Object.keys(picks).length }),
        sources: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolSchedule'), t('aiAnalyst.toolPool')],
        structured: {
          prediction: t('aiAnalyst.naConsPred'),
          risk: t('aiAnalyst.naConsRisk'),
          confidence: t('sourceBadge.medium'),
          dataUsed: t('aiAnalyst.naConsData').split(', '),
          ignoredData: t('aiAnalyst.naConsIgn').split(', '),
          rationale: t('aiAnalyst.naConsRat'),
          nextAction: t('aiAnalyst.naConsNext'),
          quality: {
            score: 76,
            label: t('aiAnalyst.naConsQLabel'),
            flags: t('aiAnalyst.naConsFlags').split(', '),
            checkedAt: new Date().toISOString(),
          },
        },
        citations: [
          {
            label: t('aiAnalyst.naConsCiteLabel'),
            value: t('aiAnalyst.naConsCiteVal', { n: Object.keys(picks).length }),
            source: t('aiAnalyst.naConsCiteSrc'),
            date: new Date().toISOString().slice(0, 10),
            confidence: t('sourceBadge.medium'),
          },
        ],
      };
      setPendingNativeAction({
        id: action,
        title: t('aiAnalyst.naConsPendTitle'),
        detail: t('aiAnalyst.naConsPendDetail', { n: Object.keys(picks).length }),
        picks,
        question: t('aiAnalyst.naConsQ'),
        answer: nextAnswer,
        meta: { provider: 'local-action', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolPool')] },
      });
      setAnswer(nextAnswer);
      setUsedAI(true);
      setLastAiMeta({ provider: 'local-action', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolPool')] });
      return;
    }

    if (action === 'day-brief') {
      const next = upcomingMatches[0];
      const rec = next ? recommendPick(next, teamItems, t) : null;
      commitAnswer(
        t('aiAnalyst.naDayQ'),
        {
          text: t('aiAnalyst.naDayText', { title: dayBrief.title, highlights: dayBrief.highlights.join(' '), next: dayBrief.nextAction }),
          sources: [t('aiAnalyst.toolSchedule'), t('aiAnalyst.toolPool'), t('aiAnalyst.toolRanking')],
          structured: {
            prediction: rec ? t('aiAnalyst.naDayPredRec', { label: rec.label }) : dayBrief.title,
            risk: rec?.risk ?? t('aiAnalyst.naDayRiskNone'),
            confidence: rec?.confidence ?? t('aiAnalyst.confHighLocal'),
            dataUsed: t('aiAnalyst.naDayData').split(', '),
            ignoredData: t('aiAnalyst.naDayIgn').split(', '),
            rationale: rec?.rationale ?? t('aiAnalyst.naDayRat'),
            nextAction: dayBrief.nextAction,
            quality: {
              score: rec?.confidence === 'Alta' ? 86 : 78,
              label: t('aiAnalyst.naDayQLabel'),
              flags: t('aiAnalyst.naDayFlags').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
          citations: dayBrief.highlights.map((highlight, index) => ({
            label: t('aiAnalyst.naDaySignal', { n: index + 1 }),
            value: highlight,
            source: t('aiAnalyst.naDaySignalSrc'),
            date: new Date().toISOString().slice(0, 10),
            confidence: index === 0 ? t('analyst.confHigh') : t('sourceBadge.medium'),
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: rec?.confidence ?? t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolSchedule'), t('aiAnalyst.toolPool'), t('aiAnalyst.toolRanking')] },
      );
      return;
    }

    if (action === 'compare-family') {
      const leader = leaderName || t('aiAnalyst.naCmpFamNoLeader');
      commitAnswer(
        t('aiAnalyst.naCmpFamQ'),
        {
          text: t('aiAnalyst.naCmpFamText', { name: pool.playerName || t('aiAnalyst.naCmpFamProfile'), pw: diagnostics.pickedPending, tp: diagnostics.totalPending, sc: diagnostics.completeScores, leader, signal: diagnostics.familySignal }),
          sources: [t('aiAnalyst.toolPool'), t('analyst.cTable')],
          structured: {
            prediction: diagnostics.pickedPending ? t('aiAnalyst.naCmpFamPredHas') : t('aiAnalyst.naCmpFamPredNone'),
            risk: t('aiAnalyst.naCmpFamRisk'),
            confidence: t('aiAnalyst.confHighLocal'),
            dataUsed: t('aiAnalyst.naCmpFamData').split(', '),
            ignoredData: t('aiAnalyst.naCmpFamIgn').split(', '),
            rationale: t('aiAnalyst.naCmpFamRat'),
            nextAction: diagnostics.recommendedAction,
            quality: {
              score: 90,
              label: t('aiAnalyst.naCmpFamQLabel'),
              flags: t('aiAnalyst.naCmpFamFlags').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
        },
        'simulation',
        { provider: 'local-action', confidence: t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolPool'), 'leaderboard'] },
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
          ? t('aiAnalyst.naAuditTextFix', { ms: diagnostics.missingScore, n: Object.keys(fixes).length })
          : t('aiAnalyst.naAuditTextNone', { cp: diagnostics.coveragePct, sp: diagnostics.scorePct }),
        sources: [t('aiAnalyst.toolPool'), t('aiAnalyst.toolAuditor')],
        structured: {
          prediction: Object.keys(fixes).length ? t('aiAnalyst.naAuditPredFix') : t('aiAnalyst.naAuditPredNone'),
          risk: t('aiAnalyst.naAuditRisk'),
          confidence: t('aiAnalyst.confHighLocal'),
          dataUsed: t('aiAnalyst.naAuditData').split(', '),
          ignoredData: t('aiAnalyst.naAuditIgn').split(', '),
          rationale: t('aiAnalyst.naAuditRat'),
          nextAction: Object.keys(fixes).length ? t('aiAnalyst.naAuditNextFix') : diagnostics.recommendedAction,
          quality: {
            score: 88,
            label: t('aiAnalyst.naAuditQLabel'),
            flags: t('aiAnalyst.naAuditFlags').split(', '),
            checkedAt: new Date().toISOString(),
          },
        },
        citations: [
          {
            label: t('aiAnalyst.naAuditCiteLabel'),
            value: t('aiAnalyst.naAuditCiteVal', { n: Object.keys(fixes).length }),
            source: t('aiAnalyst.naAuditCiteSrc'),
            date: new Date().toISOString().slice(0, 10),
            confidence: t('analyst.confHigh'),
          },
        ],
      };
      if (Object.keys(fixes).length) {
        setPendingNativeAction({
          id: action,
          title: t('aiAnalyst.naAuditPendTitle'),
          detail: t('aiAnalyst.naAuditPendDetail', { n: Object.keys(fixes).length }),
          picks: fixes as Parameters<typeof pool.importPicks>[0],
          question: t('aiAnalyst.naAuditQ'),
          answer: nextAnswer,
          meta: { provider: 'local-action', confidence: t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolPool'), t('aiAnalyst.toolAuditor')] },
        });
      } else {
        setPendingNativeAction(null);
      }
      setAnswer(nextAnswer);
      setUsedAI(true);
      setLastAiMeta({ provider: 'local-action', confidence: t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolPool'), t('aiAnalyst.toolAuditor')] });
      return;
    }

    if (action === 'family-learning') {
      commitAnswer(
        t('aiAnalyst.naLearnQ'),
        {
          text: t('aiAnalyst.naLearnText', { style: diagnostics.styleLabel, detail: diagnostics.styleDetail, signal: diagnostics.familySignal }),
          sources: [t('aiAnalyst.toolPool'), t('aiAnalyst.aiMemory'), t('analyst.cTable')],
          structured: {
            prediction: t('aiAnalyst.naLearnPred', { style: diagnostics.styleLabel.toLowerCase() }),
            risk: t('aiAnalyst.naLearnRisk'),
            confidence: diagnostics.pickedPending >= 8 ? t('sourceBadge.medium') : t('opsIntel.confLow'),
            dataUsed: t('aiAnalyst.naLearnData').split(', '),
            ignoredData: t('aiAnalyst.naLearnIgn').split(', '),
            rationale: t('aiAnalyst.naLearnRat'),
            nextAction: diagnostics.recommendedAction,
            quality: {
              score: diagnostics.pickedPending >= 8 ? 79 : 62,
              label: t('aiAnalyst.naLearnQLabel'),
              flags: t('aiAnalyst.naLearnFlags').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
        },
        'simulation',
        { provider: 'local-action', confidence: diagnostics.pickedPending >= 8 ? t('sourceBadge.medium') : t('opsIntel.confLow'), tools: [t('aiAnalyst.toolMemory'), t('aiAnalyst.toolPool')] },
      );
      return;
    }

    if (action === 'compare-strategies') {
      const strategies = comparePickStrategies(matchItems, teamItems, 6, t);
      const confL = (c: string) => c === 'Alta' ? t('opsIntel.confHigh') : c === 'Media' ? t('opsIntel.confMed') : t('opsIntel.confLow');
      const lines = strategies.map(
        (strategy) =>
          t('aiAnalyst.naCmpStratLine', { label: strategy.label, picks: strategy.picks.slice(0, 3).map((pick) => `${pick.matchLabel} ${pick.prediction}`).join('; ') }),
      );
      commitAnswer(
        t('aiAnalyst.naCmpStratQ'),
        {
          text: strategies.length
            ? t('aiAnalyst.naCmpStratText', { lines: lines.join(' ') })
            : t('aiAnalyst.naCmpStratTextNone'),
          sources: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolSchedule'), t('aiAnalyst.toolStrategies')],
          structured: {
            prediction: t('aiAnalyst.naCmpStratPred'),
            risk: t('aiAnalyst.naCmpStratRisk'),
            confidence: t('sourceBadge.medium'),
            dataUsed: t('aiAnalyst.naCmpStratData').split(', '),
            ignoredData: t('aiAnalyst.naCmpStratIgn').split(', '),
            rationale: t('aiAnalyst.naCmpStratRat'),
            nextAction: t('aiAnalyst.naCmpStratNext'),
            quality: {
              score: 82,
              label: t('aiAnalyst.naCmpStratQLabel'),
              flags: t('aiAnalyst.naCmpStratFlags').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
          citations: strategies.map((strategy) => ({
            label: strategy.label,
            value: t('aiAnalyst.naCmpStratCiteVal', { n: strategy.picks.length, conf: confL(strategy.confidence) }),
            source: strategy.summary,
            date: new Date().toISOString().slice(0, 10),
            confidence: confL(strategy.confidence),
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolStrategies'), t('aiAnalyst.toolPool')] },
      );
      return;
    }

    if (action === 'ai-scorecard') {
      const scorecard = evaluateAIStrategyOutcomes(matchItems, teamItems, t);
      commitAnswer(
        t('aiAnalyst.naScoreQ'),
        {
          text: t('aiAnalyst.naScoreText', { summary: scorecard.summary, best: scorecard.bestLabel, rows: scorecard.strategies.map((row) => t('aiAnalyst.naScoreRow', { label: row.label, pts: row.points, eff: row.efficiency })).join(' · ') }),
          sources: [t('aiAnalyst.toolResults'), t('aiAnalyst.toolStrategies')],
          structured: {
            prediction: scorecard.played ? t('aiAnalyst.naScorePredHas', { best: scorecard.bestLabel }) : t('aiAnalyst.naScorePredNone'),
            risk: scorecard.played ? t('aiAnalyst.naScoreRiskHas') : t('aiAnalyst.naScoreRiskNone'),
            confidence: scorecard.played >= 8 ? t('aiAnalyst.confHighLocal') : scorecard.played ? t('sourceBadge.medium') : t('aiAnalyst.confHighLocal'),
            dataUsed: t('aiAnalyst.naScoreData').split(', '),
            ignoredData: t('aiAnalyst.naScoreIgn').split(', '),
            rationale: t('aiAnalyst.naScoreRat'),
            nextAction: scorecard.played ? t('aiAnalyst.naScoreNextHas') : t('aiAnalyst.naScoreNextNone'),
            quality: {
              score: scorecard.played ? 86 : 78,
              label: t('aiAnalyst.naScoreQLabel'),
              flags: scorecard.played ? [t('aiAnalyst.naScoreFlagsHas')] : t('aiAnalyst.naScoreFlagsNone').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
          citations: scorecard.strategies.map((row) => ({
            label: row.label,
            value: t('aiAnalyst.naScoreCiteVal', { pts: row.points, exact: row.exactScores, hits: row.outcomeHits }),
            source: t('aiAnalyst.naScoreCiteSrc'),
            date: new Date().toISOString().slice(0, 10),
            confidence: scorecard.played ? t('sourceBadge.medium') : t('analyst.confHigh'),
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: scorecard.played ? t('sourceBadge.medium') : t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolScorecard'), t('aiAnalyst.toolResults'), t('aiAnalyst.toolStrategies')] },
      );
      return;
    }

    if (action === 'change-radar') {
      const hints = buildPickChangeHints(matchItems, teamItems, pool.picks, 6, t);
      commitAnswer(
        t('aiAnalyst.naRadarQ'),
        {
          text: hints.length
            ? t('aiAnalyst.naRadarTextHas', { n: hints.length, hints: hints.map((hint) => t('aiAnalyst.naRadarHint', { label: hint.matchLabel, current: hint.current, recommended: hint.recommended, rationale: hint.rationale })).join(' ') })
            : t('aiAnalyst.naRadarTextNone'),
          sources: [t('aiAnalyst.toolPool'), t('aiAnalyst.toolRanking'), t('aiAnalyst.toolRadar')],
          structured: {
            prediction: hints.length ? t('aiAnalyst.naRadarPredHas') : t('aiAnalyst.naRadarPredNone'),
            risk: t('aiAnalyst.naRadarRisk'),
            confidence: hints.length ? t('sourceBadge.medium') : t('aiAnalyst.confHighLocal'),
            dataUsed: t('aiAnalyst.naRadarData').split(', '),
            ignoredData: t('aiAnalyst.naRadarIgn').split(', '),
            rationale: t('aiAnalyst.naRadarRat'),
            nextAction: hints.length ? t('aiAnalyst.naRadarNextHas') : diagnostics.recommendedAction,
            quality: {
              score: hints.length ? 80 : 88,
              label: t('aiAnalyst.naRadarQLabel'),
              flags: t('aiAnalyst.naRadarFlags').split(', '),
              checkedAt: new Date().toISOString(),
            },
          },
          citations: hints.map((hint) => ({
            label: hint.matchLabel,
            value: `${hint.current} -> ${hint.recommended}`,
            source: hint.rationale,
            date: new Date().toISOString().slice(0, 10),
            confidence: t('sourceBadge.medium'),
          })),
        },
        'simulation',
        { provider: 'local-action', confidence: hints.length ? t('sourceBadge.medium') : t('aiAnalyst.confHighLocal'), tools: [t('aiAnalyst.toolPool'), t('aiAnalyst.toolRadar')] },
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
      t('aiAnalyst.naUncertainQ'),
      {
        text: uncertain.length
          ? t('aiAnalyst.naUncertainTextHas', { list: uncertain.map(({ match, diff }) => t('aiAnalyst.naUncertainItem', { home: match.home, away: match.away, diff })).join(', ') })
          : t('aiAnalyst.naUncertainTextNone'),
        sources: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolSchedule')],
        structured: {
          prediction: t('aiAnalyst.naUncertainPred'),
          risk: t('aiAnalyst.naUncertainRisk'),
          confidence: t('sourceBadge.medium'),
          dataUsed: t('aiAnalyst.naUncertainData').split(', '),
          ignoredData: t('aiAnalyst.naUncertainIgn').split(', '),
          rationale: t('aiAnalyst.naUncertainRat'),
          nextAction: t('aiAnalyst.naUncertainNext'),
          quality: {
            score: 74,
            label: t('aiAnalyst.naUncertainQLabel'),
            flags: t('aiAnalyst.naUncertainFlags').split(', '),
            checkedAt: new Date().toISOString(),
          },
        },
      },
      'simulation',
      { provider: 'local-action', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.toolRanking'), t('aiAnalyst.toolSchedule')] },
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
              <h3>{t('aiAnalyst.title')}</h3>
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
                    {t(CTX_KEYS[c])}
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
                  <option value="">{t('aiAnalyst.chooseLabel', { what: ctx === 'player' ? t('aiAnalyst.choosePlayer') : ctx === 'team' ? t('aiAnalyst.chooseTeam') : t('aiAnalyst.chooseMatch') })}</option>
                  {ctx === 'match' &&
                    (matchData?.items ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.home} vs {m.away} · {m.date}
                      </option>
                    ))}
                  {ctx === 'team' &&
                    (teamsData?.items ?? []).map((tm) => (
                      <option key={tm.code} value={tm.code}>
                        {tm.name}
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
                    <option value="">{t('aiAnalyst.choosePressMatch')}</option>
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
                  <span className="mono-label">{t('role.active')}</span>
                  <strong>{role === 'admin' ? t('role.admin') : role === 'family' ? t('role.family') : t('aiAnalyst.guestLocal')}</strong>
                </div>
                <div>
                  <span className="mono-label">{t('aiAnalyst.tools')}</span>
                  <strong>{t('aiAnalyst.toolsList')}</strong>
                </div>
                <div>
                  <span className="mono-label">{t('aiAnalyst.aiUsage')}</span>
                  <strong>{role === 'guest' ? t('aiAnalyst.blockedRemote') : t('aiAnalyst.limitedSession')}</strong>
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
                    <option value="">{t('aiAnalyst.homeOpt')}</option>
                    {(teamsData?.items ?? []).map((tm) => (
                      <option key={tm.code} value={tm.name}>{tm.name}</option>
                    ))}
                  </select>
                  <span className="muted" style={{ alignSelf: 'center' }}>vs</span>
                  <select
                    value={scanAwayTeam}
                    onChange={(e) => setScanAwayTeam(e.target.value)}
                    className="pill"
                    style={{ color: 'var(--tx)', flex: 1 }}
                  >
                    <option value="">{t('aiAnalyst.awayOpt')}</option>
                    {(teamsData?.items ?? []).map((tm) => (
                      <option key={tm.code} value={tm.name}>{tm.name}</option>
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
                      t('aiAnalyst.simTitle', { home: scanHomeTeam, away: scanAwayTeam }),
                      { text: report, sources: [t('aiAnalyst.simSrcHawk'), t('aiAnalyst.simSrcTactical')] },
                      'simulation',
                      { provider: 'local-simulation', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.simToolBoard')] },
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
                      t('aiAnalyst.pressTitle'),
                      { text: report, sources: [t('aiAnalyst.pressSrcMedia'), t('aiAnalyst.pressSrcOpinion')] },
                      'simulation',
                      { provider: 'local-simulation', confidence: t('sourceBadge.medium'), tools: [t('aiAnalyst.pressToolGuided')] },
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
                          title={t('aiAnalyst.removePdf')}
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
                          title={t('aiAnalyst.removeAudio')}
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
                        placeholder={recordingAudio ? t('aiAnalyst.recording') : t('aiAnalyst.askPlaceholder')}
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
                        title={recordingAudio ? t('aiAnalyst.stopRecording') : t('aiAnalyst.recordVoice')}
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
                        title={t('aiAnalyst.attachPdf')}
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
                          title={listening ? t('aiAnalyst.listeningTitle') : t('aiAnalyst.askByVoice')}
                        >
                          <Icon name={listening ? 'sparkSmall' : 'ai'} size={18} />
                        </button>
                      )}
                    </div>
                    <button type="submit" className="btn gold" disabled={busy || recordingAudio}>
                      <Icon name={busy ? 'sparkSmall' : 'send'} size={14} /> {busy ? t('aiAnalyst.thinking') : t('aiAnalyst.ask')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div aria-live="polite" aria-atomic="false">
          {busy && streamingText && (
            <div className="card card-pad" style={{ borderColor: 'var(--gold-line)' }}>
              <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 10 }}>
                <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
                <span className="mono-label" style={{ margin: 0 }}>
                  {t('aiAnalyst.writing')}
                </span>
                <span className="badge gold">{t('common.live')}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name="ai" size={12} style={{ color: 'var(--gold)' }} />
                {streamingProvider ? t('aiAnalyst.respondingVia', { provider: streamingProvider }) : t('aiAnalyst.connecting')}
              </span>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {streamingText.replace(/```json[\s\S]*$/, '').trim()}
                <span style={{ opacity: 0.6 }}>▍</span>
              </p>
            </div>
          )}
          </div>

          {answer && parsed && (
            <div className="card card-pad">
              <div className="row spread" style={{ marginBottom: 12, alignItems: 'center' }}>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
                  <span className="mono-label" style={{ margin: 0 }}>
                    {usedAI ? t('aiAnalyst.aiAnalyst') : t('aiAnalyst.localAnalyst')}
                  </span>
                  {usedAI && <span className="badge gold">{t('aiAnalyst.aiBadge')}</span>}
                  {lastAiMeta?.confidence && (
                    <span className={`badge ${lastAiMeta.confidence === 'Alta' || lastAiMeta.confidence === 'Alta local' ? 'gold' : ''}`} style={{ fontSize: 10 }}>
                      {lastAiMeta.confidence}
                    </span>
                  )}
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
                  {isNoteSaved ? t('aiAnalyst.saved') : t('aiAnalyst.saveToNotes')}
                </button>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => {
                    if (!answer) return;
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(answer.text.slice(0, 500));
                    utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
                    const voices = window.speechSynthesis.getVoices();
                    const preferred = voices.find(v => v.lang.startsWith(lang));
                    if (preferred) utterance.voice = preferred;
                    window.speechSynthesis.speak(utterance);
                  }}
                  title={t('aiAnalyst.listenAnswer')}
                >
                  <Icon name="ai" size={13} />
                  {t('aiAnalyst.listen')}
                </button>
              </div>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>{parsed.text}</p>

              <StructuredAnswerPanel structured={answer.structured} />
              <CitationGrid citations={answer.citations} />
              
              {parsed.chart && <AnalystChart chart={parsed.chart} />}

              <div className="analyst-source-grid">
                <div>
                  <span className="mono-label">{t('aiAnalyst.mode')}</span>
                  <strong>{usedAI ? (lastAiMeta?.model ?? t('aiAnalyst.aiProvider')) : role === 'guest' ? t('aiAnalyst.guestLocal') : t('aiAnalyst.localEngine')}</strong>
                </div>
                <div>
                  <span className="mono-label">{t('aiAnalyst.dataSent')}</span>
                  <strong>{lastAiMeta?.contextChars ? t('aiAnalyst.chars', { n: lastAiMeta.contextChars }) : t('aiAnalyst.contextSummary')}</strong>
                </div>
                <div>
                  <span className="mono-label">{t('matchDetail.confidence')}</span>
                  <strong>{lastAiMeta?.confidence ?? (usedAI ? t('sourceBadge.medium') : t('aiAnalyst.confHighLocal'))}</strong>
                </div>
              </div>
              {lastAiMeta?.tools?.length ? (
                <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
                  <span className="mono-label">{t('aiAnalyst.toolsColon')}</span>
                  {lastAiMeta.tools.map((tool) => (
                    <span key={tool} className="cite">{tool}</span>
                  ))}
                </div>
              ) : null}
              
              <div className="row gap-6 wrap" style={{ marginTop: 14 }}>
                <span className="mono-label" style={{ margin: 0 }}>
                  {t('aiAnalyst.sources')}
                </span>
                {answer.sources.map((s) => (
                  <span key={s} className="cite">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mono-label" style={{ marginTop: 12 }}>
                {t('disclaimer.full')}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('aiAnalyst.suggested')}</h3>
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
              {t('disclaimer.full')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11 }}>
          <span className="mono-label">{t('aiAnalyst.aiMemory')}</span>
          <div style={{ flex: 1, maxWidth: 120, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${memStats.percentFull}%`, height: '100%', background: memStats.percentFull > 80 ? '#ef4444' : 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <span style={{ color: 'var(--tx-3)' }}>{memStats.total}/{60}</span>
          {combinedMemory.length > 0 && (
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => {
                const lines = combinedMemory.map((r) =>
                  `[${r.createdAt}] (${r.mode}) Q: ${r.question}\nA: ${r.answer}\n---`
                ).join('\n');
                const header = `${t('aiAnalyst.exportHeader', { date: new Date().toLocaleString(lang === 'es' ? 'es-MX' : 'en-US'), n: combinedMemory.length })}\n${'='.repeat(50)}\n\n`;
                const blob = new Blob([header + lines], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `historial-ia-mundial-2026-${new Date().toISOString().slice(0, 10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title={t('aiAnalyst.exportTitle')}
            >
              <Icon name="download" size={13} />
              {t('aiAnalyst.export')}
            </button>
          )}
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
        <EntityInsightsPanel records={focusedMemory} context={t(CTX_KEYS[ctx])} />
      </div>
    </div>
  );
}
