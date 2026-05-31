import { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Icon, Pill } from '@worldcup/ui';
import { ANALYST_DISCLAIMER } from '@worldcup/shared';
import { useMatches, usePlayers, useStandings, useTeams, useVenues } from '@/hooks';
import { buildAnalystAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from '@/lib/analyst';
import { askAI, buildAIContext } from '@/lib/aiClient';

interface ParsedAnswer {
  text: string;
  chart?: {
    type: 'bar' | 'line';
    title: string;
    keys: string[];
    data: Array<{ name: string; [key: string]: number | string }>;
  } | null;
}

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

type Ctx = 'tournament' | 'match' | 'team' | 'player';

const CTX_ES: Record<Ctx, string> = {
  tournament: 'Torneo',
  match: 'Partido',
  team: 'Selección',
  player: 'Jugador',
};

export function Analyst({ ctx: ctxProp, id: idProp }: { ctx?: string; id?: string }) {
  const { data: teamsData } = useTeams();
  const { data: playersData } = usePlayers();
  const { data: matchData } = useMatches();
  const { data: venuesData } = useVenues();
  const { data: standings } = useStandings();

  const [ctx, setCtx] = useState<Ctx>((ctxProp as Ctx) ?? 'tournament');
  const [id, setId] = useState<string>(idProp ?? '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [usedAI, setUsedAI] = useState(false);

  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setListening(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
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
    const local = buildAnalystAnswer({ question: q, ctx, id: cid, ...data });

    setBusy(true);
    const ai = await askAI(q, buildAIContext(ctx, cid, data));
    setBusy(false);

    if (ai.ok && ai.answer) {
      setUsedAI(true);
      setAnswer({ text: ai.answer, sources: ['IA', 'datos locales'] });
    } else {
      setUsedAI(false);
      setAnswer(local);
    }
  };

  const parsed = useMemo(() => {
    if (!answer) return null;
    return parseAIAnswer(answer.text);
  }, [answer]);

  return (
    <div className="page-fade">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }}>
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
                {(['tournament', 'match', 'team', 'player'] as Ctx[]).map((c) => (
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

              {ctx !== 'tournament' && (
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
                    style={{ flex: 1, marginLeft: 0, paddingRight: '40px' }}
                    placeholder="Escribe una pregunta…"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  {/* Web Speech API Microphone Button */}
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
                <button type="submit" className="btn gold" disabled={busy}>
                  <Icon name={busy ? 'sparkSmall' : 'send'} size={14} /> {busy ? 'Pensando…' : 'Preguntar'}
                </button>
              </form>
            </div>
          </div>

          {answer && parsed && (
            <div className="card card-pad">
              <div className="row gap-8" style={{ marginBottom: 8 }}>
                <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
                <span className="mono-label" style={{ margin: 0 }}>
                  {usedAI ? 'Analista IA' : 'Analista local'}
                </span>
                {usedAI && <span className="badge gold">IA</span>}
              </div>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>{parsed.text}</p>
              
              {parsed.chart && <AnalystChart chart={parsed.chart} />}
              
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
            {SUGGESTED_QUESTIONS.map((s) => (
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
      </div>
    </div>
  );
}
