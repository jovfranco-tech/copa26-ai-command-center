import { useMemo, useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Icon, Pill, type IconName } from '@worldcup/ui';
import { ANALYST_DISCLAIMER, fmtDateTime, type Match as WorldCupMatch, type Team as WorldCupTeam } from '@worldcup/shared';
import { useMatches, usePlayers, useStandings, useTeams, useVenues } from '@/hooks';
import { buildAnalystAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from '@/lib/analyst';
import { askAI, buildAIContext, type AIResult } from '@/lib/aiClient';
import { clearAIMemory, createAIMemoryRecord, entityMemory, readAIMemory, saveAIMemoryRecord, type AIMemoryRecord, type AICitation, type AIStructuredAnswer } from '@/lib/aiMemory';
import { listenCloudAIInsights, saveCloudAIInsight } from '@/lib/aiCloudMemory';
import { useFavorites } from '@/store/favorites';
import { usePreferences } from '@/store/preferences';
import { usePool, type PoolPick } from '@/store/pool';
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

interface ParsedAnswer {
  text: string;
  chart?: {
    type: 'bar' | 'line';
    title: string;
    keys: string[];
    data: Array<{ name: string; [key: string]: number | string }>;
  } | null;
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

function parseAIAnswer(text: string): ParsedAnswer {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const cleanText = text.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();
      return { text: cleanText, chart: parsed.chart };
    } catch (e) {
      console.error('Failed to parse Generative UI chart JSON', e);
    }
  }
  return { text, chart: null };
}

function AnalystChart({ chart }: { chart: NonNullable<ParsedAnswer['chart']> }) {
  if (!chart || !chart.data || !chart.data.length || !chart.keys || !chart.keys.length) return null;

  const key = chart.keys[0]!;

  return (
    <div className="card" style={{ marginTop: 14, border: '1px solid var(--gold-line)', background: 'var(--bg-2)' }}>
      <div className="card-hd" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
        <Icon name="stats" size={14} style={{ color: 'var(--gold)' }} />
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{chart.title}</h4>
      </div>
      <div className="card-pad" style={{ height: 220, paddingTop: 14 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--gold-2)' }}
              />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey={key} stroke="var(--gold)" strokeWidth={2.5} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--tx-3)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--gold-2)' }}
              />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Bar dataKey={key} fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type Ctx = 'tournament' | 'match' | 'team' | 'player' | 'hawkeye' | 'pressroom';
type NativeAIAction =
  | 'conservative-pool'
  | 'compare-family'
  | 'uncertain-matches'
  | 'day-brief'
  | 'audit-picks'
  | 'family-learning'
  | 'compare-strategies'
  | 'ai-scorecard'
  | 'change-radar';

interface PendingNativeAction {
  id: NativeAIAction;
  title: string;
  detail: string;
  picks?: Record<string, PoolPick>;
  question: string;
  answer: AnalystAnswer;
  meta: AIResult['meta'];
}

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
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecciona un archivo PDF de gala válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      if (base64Data) {
        setAttachedPdf({
          name: file.name,
          data: base64Data,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (base64Data) {
            setAttachedAudio({
              name: `Nota_voz_${new Date().toLocaleTimeString('es-MX').replace(/:/g, '-')}.webm`,
              data: base64Data,
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecordingAudio(true);
      if ('vibrate' in navigator) navigator.vibrate([20]);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      alert('No se pudo acceder al micrófono. Asegúrate de dar los permisos necesarios.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecordingAudio(false);
      if ('vibrate' in navigator) navigator.vibrate([10, 5, 10]);
    }
  };

  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRec =
      (window as WindowWithSpeechRecognition).SpeechRecognition ??
      (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-ES';

      rec.onstart = () => {
        setListening(true);
      };

      rec.onend = () => {
        setListening(false);
      };

      rec.onerror = (e: Event) => {
        console.error('Speech recognition error', e);
        setListening(false);
      };

      rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
        const result = event.results[0]?.[0]?.transcript;
        if (result) {
          setQuestion(result);
        }
      };

      setRecognition(rec);
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

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
    const ai = await askAI(q, contextText, attachedPdf || undefined, attachedAudio || undefined);
    setBusy(false);
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
      const fixes: Record<string, PoolPick> = {};
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
          picks: fixes,
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
                        style={{ flex: 1, marginLeft: 0, paddingRight: recognition ? '94px' : '68px' }}
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
                          right: recognition ? '64px' : '36px',
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
                          right: recognition ? '36px' : '8px',
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

                      {recognition && (
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

function AIActionPanel({
  groupId,
  cloudStatus,
  onRun,
}: {
  groupId: string;
  cloudStatus: 'syncing' | 'synced' | 'error';
  onRun: (action: NativeAIAction) => void;
}) {
  const actions: Array<{ id: NativeAIAction; icon: IconName; title: string; text: string }> = [
    { id: 'day-brief', icon: 'sparkSmall', title: 'Resumen del día', text: 'Prioriza partido, clima, picks y acción.' },
    { id: 'conservative-pool', icon: 'target', title: 'Rellenar conservadora', text: 'Aplica picks de baja varianza por ranking.' },
    { id: 'audit-picks', icon: 'check', title: 'Auditar picks', text: 'Completa marcadores sin sobrescribir.' },
    { id: 'compare-family', icon: 'trophy', title: 'Comparar familia', text: 'Resume cobertura y tabla visible.' },
    { id: 'family-learning', icon: 'database', title: 'Aprender estilo', text: 'Detecta patrón de riesgo familiar.' },
    { id: 'compare-strategies', icon: 'stats', title: 'Comparar estrategias', text: 'Conservadora, agresiva y contraria.' },
    { id: 'change-radar', icon: 'activity', title: 'Radar de cambios', text: 'Explica por qué difiere un pick.' },
    { id: 'ai-scorecard', icon: 'shield', title: 'Medir IA', text: 'Puntúa estrategias cuando haya FT.' },
    { id: 'uncertain-matches', icon: 'activity', title: 'Detectar inciertos', text: 'Encuentra cruces parejos para revisar.' },
  ];
  return (
    <div className="ai-action-panel">
      <div className="ai-action-head">
        <div>
          <span className="mono-label">Acciones AI-native</span>
          <strong>Opera sobre quiniela y datos locales</strong>
        </div>
        <span className={`badge ${cloudStatus === 'synced' ? 'gold' : ''}`}>
          {cloudStatus === 'synced' ? `Memoria compartida · ${groupId}` : cloudStatus === 'syncing' ? 'Sincronizando memoria' : 'Memoria local activa'}
        </span>
      </div>
      <div className="ai-action-grid">
        {actions.map((action) => (
          <button key={action.id} type="button" className="ai-action-card" onClick={() => onRun(action.id)}>
            <Icon name={action.icon} size={15} />
            <strong>{action.title}</strong>
            <span>{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PendingNativeActionPanel({
  pending,
  onApply,
  onCancel,
}: {
  pending: PendingNativeAction | null;
  onApply: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  const entries = Object.entries(pending.picks ?? {});
  return (
    <div className="pending-ai-action">
      <div className="pending-ai-action-main">
        <Icon name="shield" size={15} />
        <div>
          <span className="mono-label">Previsualización antes de aplicar</span>
          <strong>{pending.title}</strong>
          <p>{pending.detail}</p>
        </div>
      </div>
      {entries.length ? (
        <div className="pending-pick-strip">
          {entries.slice(0, 5).map(([matchId, pick]) => (
            <span key={matchId}>
              <strong>{matchId}</strong> {pick.homeGoals ?? '-'}-{pick.awayGoals ?? '-'} · {pick.outcome ?? 'sin ganador'}
            </span>
          ))}
          {entries.length > 5 ? <span>+{entries.length - 5} más</span> : null}
        </div>
      ) : null}
      <div className="pending-ai-actions">
        <button type="button" className="btn gold" onClick={onApply}>
          <Icon name="check" size={14} /> Aplicar cambios
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          <Icon name="close" size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}

function StructuredAnswerPanel({ structured }: { structured?: AIStructuredAnswer }) {
  if (!structured) return null;
  const cards: Array<{ key: keyof AIStructuredAnswer; label: string; icon: IconName; value?: string }> = [
    { key: 'prediction', label: 'Lectura', icon: 'target', value: structured.prediction },
    { key: 'risk', label: 'Riesgo', icon: 'shield', value: structured.risk },
    { key: 'confidence', label: 'Confianza', icon: 'activity', value: structured.confidence },
    { key: 'nextAction', label: 'Siguiente acción', icon: 'check', value: structured.nextAction },
  ];

  return (
    <div className="structured-answer-grid">
      {cards.filter((card) => card.value).map((card) => (
        <div key={card.key} className="structured-answer-card">
          <Icon name={card.icon} size={14} />
          <span className="mono-label">{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
      {structured.dataUsed?.length ? (
        <div className="structured-answer-card data-used">
          <Icon name="database" size={14} />
          <span className="mono-label">Datos usados</span>
          <div className="row gap-6 wrap">
            {structured.dataUsed.map((item) => (
              <span key={item} className="cite">{item}</span>
            ))}
          </div>
        </div>
      ) : null}
      {structured.ignoredData?.length || structured.rationale ? (
        <div className="structured-answer-card traceability">
          <Icon name="shield" size={14} />
          <span className="mono-label">Trazabilidad</span>
          {structured.rationale ? <strong>{structured.rationale}</strong> : null}
          {structured.ignoredData?.length ? (
            <div className="row gap-6 wrap">
              {structured.ignoredData.map((item) => (
                <span key={item} className="cite muted-cite">{item}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {structured.quality ? (
        <div className="structured-answer-card quality-check">
          <Icon name="check" size={14} />
          <span className="mono-label">Evaluación automática</span>
          <strong>{structured.quality.score}/100 · {structured.quality.label}</strong>
          <div className="row gap-6 wrap">
            {structured.quality.flags.slice(0, 3).map((flag) => (
              <span key={flag} className="cite">{flag}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CitationGrid({ citations }: { citations?: AICitation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="citation-grid">
      {citations.map((citation) => (
        <div key={`${citation.label}-${citation.value}`} className="citation-card">
          <span className="mono-label">{citation.label}</span>
          <strong>{citation.value}</strong>
          <p>{citation.source}</p>
          <div className="row gap-6 wrap">
            {citation.date ? <span className="cite">{citation.date}</span> : null}
            {citation.confidence ? <span className="cite">{citation.confidence}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyBriefPanel({
  matches,
  teams,
  picks,
  onRun,
}: {
  matches: WorldCupMatch[];
  teams: WorldCupTeam[];
  picks: Record<string, PoolPick>;
  onRun: () => void;
}) {
  const brief = buildDayBrief(matches, teams, picks);
  return (
    <div className="card ai-daily-brief">
      <div className="card-hd">
        <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
        <h3>Brief diario</h3>
        <span className="spacer" />
        <button type="button" className="card-link" onClick={onRun}>Generar</button>
      </div>
      <div className="card-pad">
        <strong>{brief.title}</strong>
        <p>{brief.subtitle}</p>
        <div className="daily-brief-list">
          {brief.highlights.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <small>{brief.nextAction}</small>
      </div>
    </div>
  );
}

function AIQualityHistory({ records }: { records: AIMemoryRecord[] }) {
  const scored = records.filter((record) => record.structured?.quality);
  const average = scored.length
    ? Math.round(scored.reduce((sum, record) => sum + (record.structured?.quality?.score ?? 0), 0) / scored.length)
    : 0;
  const flags = scored.flatMap((record) => record.structured?.quality?.flags ?? []).slice(0, 4);
  return (
    <div className="card ai-quality-history">
      <div className="card-hd">
        <Icon name="check" size={15} style={{ color: 'var(--gold)' }} />
        <h3>Calidad IA</h3>
      </div>
      <div className="card-pad">
        <div className="ai-quality-score">
          <span className="mono-label">Historial</span>
          <strong>{scored.length ? `${average}/100` : 'Sin datos'}</strong>
          <p>{scored.length ? `${scored.length} respuestas evaluadas.` : 'Se activa con acciones y respuestas estructuradas.'}</p>
        </div>
        {flags.length ? (
          <div className="row gap-6 wrap" style={{ marginTop: 8 }}>
            {flags.map((flag) => (
              <span key={flag} className="cite">{flag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EntityInsightsPanel({ records, context }: { records: AIMemoryRecord[]; context: string }) {
  return (
    <div className="card ai-entity-panel">
      <div className="card-hd">
        <Icon name="activity" size={15} style={{ color: 'var(--gold)' }} />
        <h3>Insights del contexto</h3>
      </div>
      <div className="card-pad">
        {!records.length ? (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Pregunta sobre este {context.toLowerCase()} para guardar una lectura reutilizable.
          </p>
        ) : (
          <div className="entity-insight-list">
            {records.map((record) => (
              <div key={record.id} className="entity-insight-row">
                <span className="mono-label">{fmtDateTime(record.createdAt)}</span>
                <strong>{record.structured?.prediction ?? record.question}</strong>
                <p>{record.structured?.nextAction ?? record.answer.slice(0, 120)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AIMemoryPanel({
  records,
  onReuse,
  onClear,
}: {
  records: AIMemoryRecord[];
  onReuse: (record: AIMemoryRecord) => void;
  onClear: () => void;
}) {
  return (
    <div className="card ai-memory-panel">
      <div className="card-hd">
        <Icon name="database" size={15} style={{ color: 'var(--gold)' }} />
        <h3>Memoria IA</h3>
        <span className="spacer" />
        {records.length ? (
          <button type="button" className="card-link" onClick={onClear}>Limpiar</button>
        ) : null}
      </div>
      <div className="card-pad">
        {!records.length ? (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Las preguntas guardadas aparecerán aquí para reutilizarlas durante la quiniela.
          </p>
        ) : (
          <div className="ai-memory-list">
            {records.slice(0, 6).map((record) => (
              <button key={record.id} type="button" className="ai-memory-row" onClick={() => onReuse(record)}>
                <span className="mono-label">{fmtDateTime(record.createdAt)}</span>
                <strong>{record.question}</strong>
                <small>
                  {record.mode === 'remote' ? record.model ?? 'IA remota' : record.mode === 'simulation' ? 'Simulación local' : 'Local'}
                  {' · '}
                  {record.entityType ?? 'global'}
                  {' · '}
                  {record.confidence}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HawkEyePitch({
  homeTeam,
  awayTeam,
  onSimulate,
  simulating,
}: {
  homeTeam: string;
  awayTeam: string;
  onSimulate: (report: string) => void;
  simulating: boolean;
}) {
  const [homePlayers, setHomePlayers] = useState([
    { id: 'h1', role: 'Delantero', x: 120, y: 80, label: 'Delantero Centro' },
    { id: 'h2', role: 'Mediocentro', x: 80, y: 150, label: 'Volante Creativo' },
    { id: 'h3', role: 'Defensa', x: 120, y: 220, label: 'Cierre Defensivo' },
  ]);
  const [awayPlayers, setAwayPlayers] = useState([
    { id: 'a1', role: 'Delantero', x: 120, y: 320, label: 'Punta Veloz' },
    { id: 'a2', role: 'Mediocentro', x: 180, y: 250, label: 'Contención' },
    { id: 'a3', role: 'Defensa', x: 120, y: 180, label: 'Líbero' },
  ]);

  const [activePlayer, setActivePlayer] = useState<{ id: string; team: 'home' | 'away' } | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (id: string, team: 'home' | 'away') => {
    setActivePlayer({ id, team });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePlayer || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
    const y = Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top));

    if (activePlayer.team === 'home') {
      setHomePlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? { ...p, x, y } : p)));
    } else {
      setAwayPlayers((prev) => prev.map((p) => (p.id === activePlayer.id ? { ...p, x, y } : p)));
    }
  };

  const handlePointerUp = () => {
    setActivePlayer(null);
  };

  return (
    <div className="card card-pad animate-fade-in" style={{ background: 'rgba(10, 20, 12, 0.9)', border: '1px solid var(--gold-line)' }}>
      <h4 style={{ margin: '0 0 10px 0', color: 'var(--gold)' }}>🦅 Pizarra del Analista: Ojo del Halcón IA</h4>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 14 }}>
        Arrastra las fichas tácticas doradas ({homeTeam || 'Local'}) y verdes ({awayTeam || 'Visita'}) en el césped táctico para planificar su enfrentamiento en vivo.
      </p>

      <div
        ref={pitchRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: '100%',
          height: 380,
          background: '#153a1a',
          backgroundImage: 'radial-gradient(#1f5326 30%, #153a1a 80%)',
          borderRadius: 16,
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          touchAction: 'none',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 80,
              height: 80,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 140,
              height: 60,
              border: '1px solid rgba(255,255,255,0.2)',
              borderTop: 'none',
              transform: 'translateX(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              width: 140,
              height: 60,
              border: '1px solid rgba(255,255,255,0.2)',
              borderBottom: 'none',
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        {homePlayers.map((p) => (
          <div
            key={p.id}
            onPointerDown={() => handlePointerDown(p.id, 'home')}
            style={{
              position: 'absolute',
              left: p.x - 20,
              top: p.y - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c9a24b, #b38827)',
              color: '#000',
              fontWeight: 700,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              cursor: 'grab',
              userSelect: 'none',
              border: '2px solid #fff',
              zIndex: activePlayer?.id === p.id ? 100 : 20,
              transition: activePlayer?.id === p.id ? 'none' : 'transform 0.1s ease',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
            title={p.label}
          >
            {p.role.slice(0, 3)}
          </div>
        ))}

        {awayPlayers.map((p) => (
          <div
            key={p.id}
            onPointerDown={() => handlePointerDown(p.id, 'away')}
            style={{
              position: 'absolute',
              left: p.x - 20,
              top: p.y - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #047857)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              cursor: 'grab',
              userSelect: 'none',
              border: '2px solid #fff',
              zIndex: activePlayer?.id === p.id ? 100 : 20,
              transition: activePlayer?.id === p.id ? 'none' : 'transform 0.1s ease',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
            title={p.label}
          >
            {p.role.slice(0, 3)}
          </div>
        ))}
      </div>

      <div className="row spread align-center" style={{ marginTop: 14 }}>
        <span className="mono-label" style={{ fontSize: 10.5 }}>Configuración activa: 3 vs 3 táctico</span>
        <button
          type="button"
          className="btn gold"
          style={{ padding: '6px 14px', fontSize: 12.5 }}
          onClick={() => {
            const report = 
              `**ANÁLISIS HAWK-EYE TÁCTICO (${homeTeam} vs ${awayTeam}):**\n\n` +
              `1. **Disposición Local (${homeTeam}):** Con un delantero centro posicionado ofensivamente en (${homePlayers[0].x}, ${homePlayers[0].y}) y soporte creativo, logran un carril de aproximación rápido en el flanco izquierdo.\n` +
              `2. **Bloque Defensivo de ${awayTeam}:** El líbero ubicado en (${awayPlayers[2].x}, ${awayPlayers[2].y}) intercepta eficazmente el juego aéreo, forzando disparos de media distancia.\n` +
              `3. **Veredicto del Analista:** El posicionamiento favorece un contragolpe rápido de ${awayTeam} debido al adelantamiento de líneas locales. Resultado estimado: 1-2 a favor de ${awayTeam}.`;
            onSimulate(report);
            if ('vibrate' in navigator) navigator.vibrate([20, 40, 20]);
          }}
          disabled={simulating || !homeTeam || !awayTeam}
        >
          <Icon name={simulating ? 'sparkSmall' : 'ai'} size={13} />
          {simulating ? 'Computando...' : 'Simular Choque'}
        </button>
      </div>
    </div>
  );
}

function PressRoom({
  matchId,
  matches,
  onAnswer,
  answering,
}: {
  matchId: string;
  matches: WorldCupMatch[];
  onAnswer: (text: string) => void;
  answering: boolean;
}) {
  const [activeJournalist, setActiveJournalist] = useState<'jeanluc' | 'gary' | 'diego'>('jeanluc');
  const [userResponse, setUserResponse] = useState('');

  const selectedMatch = matches.find((m) => m.id === matchId) || matches[0];

  const questions = useMemo(() => {
    if (!selectedMatch) return { jeanluc: '', gary: '', diego: '' };
    const h = selectedMatch.home;
    const a = selectedMatch.away;
    return {
      jeanluc: `¿Crees que el planteamiento defensivo de ${h} será suficiente para anular la fluidez táctica de ${a}?`,
      gary: `Los modelos de Expected Goals (xG) otorgan a ${a} una ventaja del 64%. ¿Cuál es tu argumento analítico para tu pick?`,
      diego: `¡Che! ¿Realmente pensás que la pasión de ${h} alcanzará para arrebatarle el resultado a ${a} en este partido de gala?`,
    };
  }, [selectedMatch]);

  return (
    <div className="card card-pad animate-fade-in" style={{ background: 'rgba(15, 15, 20, 0.95)', border: '1px solid var(--gold-line)' }}>
      <div className="row gap-8 align-center" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>🎙️</span>
        <h4 style={{ margin: 0, color: 'var(--gold)' }}>Sala de Prensa Oficial: Copa del Mundo</h4>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        Responde a las preguntas de la prensa deportiva internacional sobre el partido {selectedMatch ? `${selectedMatch.home} vs ${selectedMatch.away}` : 'destacado'}.
      </p>

      <div className="row gap-6" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`pill ${activeJournalist === 'jeanluc' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('jeanluc')}
          style={{ fontSize: 11.5 }}
        >
          🇫🇷 Jean-Luc (L'Equipe)
        </button>
        <button
          type="button"
          className={`pill ${activeJournalist === 'gary' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('gary')}
          style={{ fontSize: 11.5 }}
        >
          🇬🇧 Gary (The Athletic)
        </button>
        <button
          type="button"
          className={`pill ${activeJournalist === 'diego' ? 'on' : ''}`}
          onClick={() => setActiveJournalist('diego')}
          style={{ fontSize: 11.5 }}
        >
          🇦🇷 Diego (TyC Sports)
        </button>
      </div>

      <div
        className="row gap-12"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--gold-line)',
          borderRadius: 16,
          padding: '16px',
          marginBottom: 18,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <img
            src={`/avatars/${activeJournalist}.png`}
            alt={
              activeJournalist === 'jeanluc'
                ? "Jean-Luc (L'Equipe)"
                : activeJournalist === 'gary'
                ? "Gary (The Athletic)"
                : "Diego (TyC Sports)"
            }
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 10px rgba(201, 162, 75, 0.3)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              fontSize: 14,
              background: 'var(--bg-3)',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {activeJournalist === 'jeanluc' ? '🇫🇷' : activeJournalist === 'gary' ? '🇬🇧' : '🇦🇷'}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div className="mono-label" style={{ fontSize: 10, color: 'var(--gold-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeJournalist === 'jeanluc'
              ? "Jean-Luc · L'Equipe"
              : activeJournalist === 'gary'
              ? "Gary · The Athletic"
              : "Diego · TyC Sports"}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--tx-2)',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            "{questions[activeJournalist]}"
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          className="searchbox"
          rows={3}
          style={{ width: '100%', height: 'auto', resize: 'none', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}
          placeholder="Escribe tu justificación táctica para la prensa..."
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
        />
        <div className="row spread align-center">
          <span className="mono-label" style={{ fontSize: 10 }}>Filtro de prensa activo: Moderado</span>
          <button
            type="button"
            className="btn gold"
            style={{ padding: '6px 14px', fontSize: 12.5 }}
            onClick={() => {
              if (!userResponse.trim()) {
                alert('Escribe una respuesta para responder a la prensa.');
                return;
              }
              const score = Math.floor(Math.random() * 20) + 80;
              const reporterName = activeJournalist === 'jeanluc' ? "Jean-Luc (L'Equipe)" : activeJournalist === 'gary' ? "Gary (The Athletic)" : "Diego (TyC Sports)";
              const feedback = 
                `**RUEDA DE PRENSA: EVALUACIÓN DEL COMENTARIO TÁCTICO**\n\n` +
                `*   **Pregunta de:** ${reporterName}\n` +
                `*   **Tu respuesta:** "${userResponse}"\n\n` +
                `⚽ **Nivel de Aprobación de la Prensa:** ${score}%\n\n` +
                `*   **Comentario del Panel:** Tu análisis destaca por una sólida comprensión del parado táctico y la diferencia física. ` +
                `Sin embargo, algunos redactores señalan que subestimas las jugadas a balón parado. ¡Una rueda de prensa sumamente elocuente!`;
              onAnswer(feedback);
              setUserResponse('');
              if ('vibrate' in navigator) navigator.vibrate([30, 10, 30]);
            }}
            disabled={answering}
          >
            🎙️ Responder a la Prensa
          </button>
        </div>
      </div>
    </div>
  );
}
