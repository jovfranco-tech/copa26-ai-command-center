import { useState } from 'react';
import { Icon, Pill } from '@worldcup/ui';
import { ANALYST_DISCLAIMER } from '@worldcup/shared';
import { useMatches, usePlayers, useStandings, useTeams } from '@/hooks';
import { buildAnalystAnswer, SUGGESTED_QUESTIONS, type AnalystAnswer } from '@/lib/analyst';

type Ctx = 'tournament' | 'match' | 'team' | 'player';

export function Analyst({ ctx: ctxProp, id: idProp }: { ctx?: string; id?: string }) {
  const { data: teamsData } = useTeams();
  const { data: playersData } = usePlayers();
  const { data: matchData } = useMatches();
  const { data: standings } = useStandings();

  const [ctx, setCtx] = useState<Ctx>((ctxProp as Ctx) ?? 'tournament');
  const [id, setId] = useState<string>(idProp ?? '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);

  const ask = (qOverride?: string) => {
    const q = qOverride ?? question;
    const res = buildAnalystAnswer({
      question: q,
      ctx,
      id: ctx === 'tournament' ? undefined : id,
      teams: teamsData?.items ?? [],
      players: playersData?.items ?? [],
      matches: matchData?.items ?? [],
      standings: standings?.groups ?? {},
    });
    if (qOverride) setQuestion(qOverride);
    setAnswer(res);
  };

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
              <h3>Match Analyst</h3>
            </div>
            <div className="card-pad brief-body">
              <p style={{ marginTop: 0 }}>
                Ask about the tournament, a match, a team or a player. Answers are composed from your local
                cached data only — nothing leaves this machine.
              </p>

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
                    {c}
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
                  <option value="">Select a {ctx}…</option>
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
                <input
                  className="searchbox"
                  style={{ flex: 1, marginLeft: 0 }}
                  placeholder="Ask a question…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <button type="submit" className="btn gold">
                  <Icon name="send" size={14} /> Ask
                </button>
              </form>
            </div>
          </div>

          {answer && (
            <div className="card card-pad">
              <div className="row gap-8" style={{ marginBottom: 8 }}>
                <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
                <span className="mono-label" style={{ margin: 0 }}>
                  Analyst
                </span>
              </div>
              <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.6 }}>{answer.text}</p>
              <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
                <span className="mono-label" style={{ margin: 0 }}>
                  Sources:
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
            <h3>Suggested</h3>
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
