import { useMemo, useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Icon, Pill } from '@worldcup/ui';
import { ANALYST_DISCLAIMER, type Match as WorldCupMatch } from '@worldcup/shared';
import { useMatches, usePlayers, useStandings, useTeams, useVenues } from '@/hooks';
import { buildAnalystAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from '@/lib/analyst';
import { askAI, buildAIContext, type AIResult } from '@/lib/aiClient';
import { clearAIMemory, readAIMemory, saveAIMemory, type AIMemoryRecord } from '@/lib/aiMemory';
import { useFavorites } from '@/store/favorites';
import { usePreferences } from '@/store/preferences';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

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
  const [memory, setMemory] = useState<AIMemoryRecord[]>(() => readAIMemory());
  const role = usePreferences((s) => s.role);

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
              name: `Nota_voz_${new Date().toLocaleTimeString('es-ES').replace(/:/g, '-')}.webm`,
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
    setMemory(saveAIMemory({
      question: q,
      answer: next.text,
      mode,
      context: CTX_ES[ctx],
      sources: next.sources,
      confidence: meta?.confidence ?? (mode === 'local' ? 'Alta local' : 'Media'),
      model: meta?.model,
      tools: meta?.tools,
    }));
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
      commitAnswer(q, { text: ai.answer, sources: ai.meta?.sources ?? ['IA', 'datos locales'] }, 'remote', ai.meta);
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
          records={memory}
          onReuse={(record) => {
            setQuestion(record.question);
            setAnswer({ text: record.answer, sources: record.sources });
            setUsedAI(record.mode !== 'local');
            setLastAiMeta({ model: record.model, confidence: record.confidence, tools: record.tools });
          }}
          onClear={() => setMemory(clearAIMemory())}
        />
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
                <span className="mono-label">{new Date(record.createdAt).toLocaleString()}</span>
                <strong>{record.question}</strong>
                <small>{record.mode === 'remote' ? record.model ?? 'IA remota' : record.mode === 'simulation' ? 'Simulación local' : 'Local'} · {record.confidence}</small>
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
