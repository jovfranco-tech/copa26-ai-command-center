import { useEffect, useMemo, useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useTeamsMap } from '@/hooks';
import { usePool, type PoolOutcome } from '@/store/pool';
import { askPoolAgent } from '@/lib/aiClient';
import { fetchLeaderboard, fetchPoolPicks, syncPoolPicks, type LeaderboardEntry } from '@/lib/api';



const OUTCOMES: Array<{ id: PoolOutcome; label: string }> = [
  { id: 'home', label: 'Local' },
  { id: 'draw', label: 'Empate' },
  { id: 'away', label: 'Visita' },
];

export function Pool() {
  const { data, isLoading } = useMatches();
  const teams = useTeamsMap();
  const pool = usePool();
  const [view, setView] = useState<'next' | 'all'>('next');
  const [activeTab, setActiveTab] = useState<'predict' | 'results'>('predict');

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
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const summonAgent = async (agentName: 'optimista' | 'stats' | 'contrarian') => {
    if (loadingAgent) return;
    setLoadingAgent(true);
    setAgentError(null);

    const matchesToPredict = upcomingMatches.map((m) => ({
      id: m.id,
      home: m.home,
      away: m.away,
      homeName: teams[m.home]?.name ?? m.home,
      awayName: teams[m.away]?.name ?? m.away,
    }));

    try {
      const res = await askPoolAgent(agentName, matchesToPredict);
      if (res.ok && res.predictions) {
        pool.importPicks(res.predictions);
        setActiveAgent(agentName);
        setAgentBrief(res.brief ?? null);
      } else {
        setAgentError(
          res.reason === 'no-key'
            ? 'No se ha configurado la API Key de OpenAI para habilitar co-pilotos.'
            : 'Error al conectar con el co-piloto.',
        );
      }
    } catch {
      setAgentError('Error de red al invocar al co-piloto.');
    } finally {
      setLoadingAgent(false);
    }
  };

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Load existing picks from DB when the participant name changes
  useEffect(() => {
    if (!pool.playerName.trim()) return;

    const loadPicks = async () => {
      try {
        const res = await fetchPoolPicks(pool.playerName);
        if (res.ok && res.picks && Object.keys(res.picks).length > 0) {
          pool.importPicks(res.picks);
          setSyncStatus('synced');
        }
      } catch (e) {
        console.error('Failed to load picks from SQLite', e);
      }
    };
    loadPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.playerName]);

  // Sync picks to local database (debounced to avoid spamming the connection)
  useEffect(() => {
    if (!pool.playerName.trim()) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const ok = await syncPoolPicks(pool.playerName, pool.picks);
        if (ok) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [pool.playerName, pool.picks]);

  // Load Leaderboard when results tab is open
  useEffect(() => {
    if (activeTab === 'results') {
      const loadLeaderboard = async () => {
        setLoadingLeaderboard(true);
        try {
          const res = await fetchLeaderboard();
          if (res.ok && res.leaderboard) {
            setLeaderboard(res.leaderboard);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingLeaderboard(false);
        }
      };
      loadLeaderboard();
    }
  }, [activeTab, pool.picks]);

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

  // Determine what is visible in the active tab
  const visible = useMemo(() => {
    if (activeTab === 'predict') {
      return view === 'next' ? upcomingMatches.slice(0, 24) : upcomingMatches;
    }
    return playedMatches; // results shows all played matches
  }, [activeTab, view, upcomingMatches, playedMatches]);

  const pickedPending = upcomingMatches.filter((m) => pool.picks[m.id]?.outcome).length;
  const completeScoresPending = upcomingMatches.filter((m) => {
    const p = pool.picks[m.id];
    return p?.homeGoals != null && p?.awayGoals != null;
  }).length;

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
            Guarda tus picks en este navegador. Cuando empiece el torneo, los resultados reales servirán para comparar
            aciertos.
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
                {syncStatus === 'synced' ? 'Guardado en DB' : syncStatus === 'syncing' ? 'Sincronizando…' : 'Sin conexión'}
              </span>
            )}
          </label>
          <input
            id="pool-name"
            value={pool.playerName}
            onChange={(e) => pool.setPlayerName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
      </div>

      <div className="pool-tabs">
        <button
          type="button"
          className={`pool-tab${activeTab === 'predict' ? ' on' : ''}`}
          onClick={() => setActiveTab('predict')}
        >
          <Icon name="calendar" size={15} />
          Pronosticar
          <span className="pool-tab-badge">{upcomingMatches.length}</span>
        </button>
        <button
          type="button"
          className={`pool-tab${activeTab === 'results' ? ' on' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          <Icon name="trophy" size={15} />
          Resultados y Aciertos
          <span className="pool-tab-badge">{playedMatches.length}</span>
        </button>
      </div>

      {activeTab === 'predict' ? (
        <div className="pool-summary">
          <SummaryTile icon="check" label="Partidos elegidos" value={`${pickedPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="target" label="Marcadores" value={`${completeScoresPending}/${upcomingMatches.length}`} />
          <SummaryTile icon="calendar" label="Vista" value={view === 'next' ? 'Próximos 24' : 'Completa'} />
          <div className="card card-pad pool-actions">
            <button type="button" className="btn gold" onClick={() => setView(view === 'next' ? 'all' : 'next')}>
              <Icon name={view === 'next' ? 'list' : 'calendar'} size={15} />
              {view === 'next' ? 'Ver todo' : 'Ver próximos'}
            </button>
            <button type="button" className="btn ghost" onClick={() => pool.reset()}>
              <Icon name="close" size={15} />
              Reiniciar
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
                <div className="copilot-avatar">⚡️</div>
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
                disabled={loadingAgent}
              >
                {loadingAgent && activeAgent === 'optimista' ? 'Convocando…' : activeAgent === 'optimista' ? 'Activo' : 'Invocar Optimista'}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'stats' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">📊</div>
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
                disabled={loadingAgent}
              >
                {loadingAgent && activeAgent === 'stats' ? 'Convocando…' : activeAgent === 'stats' ? 'Activo' : 'Invocar Estadístico'}
              </button>
            </div>

            <div className={`copilot-card${activeAgent === 'contrarian' ? ' active' : ''}`}>
              <div className="row gap-12" style={{ alignItems: 'center' }}>
                <div className="copilot-avatar">🔥</div>
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
                disabled={loadingAgent}
              >
                {loadingAgent && activeAgent === 'contrarian' ? 'Convocando…' : activeAgent === 'contrarian' ? 'Activo' : 'Invocar Contrarian'}
              </button>
            </div>
          </div>

          {activeAgent && agentBrief && (
            <div className="copilot-brief">
              <span style={{ fontSize: 24 }}>💬</span>
              <div>
                <span className="mono-label" style={{ display: 'block', marginBottom: 4, color: 'var(--gold)' }}>
                  Informe Táctico del Co-piloto ({activeAgent === 'optimista' ? 'Optimista' : activeAgent === 'stats' ? 'Estadístico' : 'Contrarian'})
                </span>
                <p className="copilot-brief-text">{agentBrief}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="copilot-section" style={{ marginBottom: 24 }}>
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <Icon name="trophy" size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Ranking Familiar (Leaderboard)</h3>
            <span className="badge gold">Compartido</span>
          </div>
          <p className="muted" style={{ margin: '0 0 12px 0', fontSize: 12 }}>
            Puntuaciones en tiempo real de todos los participantes basándose en los resultados de la base de datos local SQLite.
          </p>

          {loadingLeaderboard ? (
            <p className="muted" style={{ fontSize: 13 }}>Cargando tabla de posiciones…</p>
          ) : !leaderboard.length ? (
            <div className="card card-pad muted" style={{ fontSize: 13, textAlign: 'center' }}>
              No hay predicciones sincronizadas en la base de datos local todavía. ¡Escribe tu nombre y guarda algunos marcadores!
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
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                    const isCurrentUser = row.playerName.trim().toLowerCase() === pool.playerName.trim().toLowerCase();

                    return (
                      <tr
                        key={row.playerName}
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
        <div className="pool-grid">
          {visible.map((m) => (
            <PoolMatch key={m.id} match={m} homeName={teams[m.home]?.name ?? m.home} awayName={teams[m.away]?.name ?? m.away} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="card card-pad pool-stat">
      <Icon name={icon} size={16} style={{ color: 'var(--gold)' }} />
      <span className="mono-label">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

function PoolMatch({ match, homeName, awayName }: { match: Match; homeName: string; awayName: string }) {
  const pick = usePool((s) => s.picks[match.id]);
  const setOutcome = usePool((s) => s.setOutcome);
  const setScore = usePool((s) => s.setScore);
  const clearMatch = usePool((s) => s.clearMatch);

  const isLocked = match.status !== 'UPCOMING';

  const scoreValue = (v: number | undefined) => (v == null ? '' : String(v));
  const parseScore = (value: string) => {
    if (value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(30, Math.round(n))) : undefined;
  };

  const outcome = pick?.outcome;
  const homeGoals = pick?.homeGoals;
  const awayGoals = pick?.awayGoals;

  const pointsInfo = useMemo(() => {
    if (!isLocked || !outcome) return null;
    const realHome = match.homeGoals ?? 0;
    const realAway = match.awayGoals ?? 0;

    let realOutcome: 'home' | 'draw' | 'away' = 'draw';
    if (realHome > realAway) realOutcome = 'home';
    else if (realHome < realAway) realOutcome = 'away';

    const isExact = homeGoals === realHome && awayGoals === realAway;
    const isOutcomeCorrect = outcome === realOutcome;

    if (isExact) {
      return { text: '+3 PTS', className: 'gold-badge', label: 'Marcador Exacto', icon: 'trophy' };
    } else if (isOutcomeCorrect) {
      return { text: '+1 PT', className: 'green-badge', label: 'Resultado Correcto', icon: 'check' };
    } else {
      return { text: '0 PTS', className: 'gray-badge', label: 'Predicción Incorrecta', icon: 'close' };
    }
  }, [isLocked, outcome, homeGoals, awayGoals, match.homeGoals, match.awayGoals]);

  return (
    <div className={`card pool-match${isLocked ? ' is-locked' : ''}`}>
      <div className="pool-match-head">
        {match.status === 'LIVE' ? (
          <span className="pool-match-status-pill live">En vivo</span>
        ) : isLocked ? (
          <span className="pool-match-status-pill ft">Finalizado</span>
        ) : (
          <span className="badge up">{match.time}</span>
        )}
        <span className="mono-label">{fmtDay(match.date)}</span>

        {pointsInfo ? (
          <span className={`badge-points ${pointsInfo.className}`} title={pointsInfo.label}>
            <Icon name={pointsInfo.icon} size={11} />
            {pointsInfo.text}
          </span>
        ) : !isLocked ? (
          <button type="button" className="fav-btn" onClick={() => clearMatch(match.id)} aria-label="Limpiar partido">
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>
      <div className="pool-teams">
        <TeamCrest code={match.home} size={34} />
        <div>
          <strong>{homeName}</strong>
          <span className="mono-label">{match.home}</span>
        </div>
        <span className="pool-vs">vs</span>
        <div className="pool-away">
          <strong>{awayName}</strong>
          <span className="mono-label">{match.away}</span>
        </div>
        <TeamCrest code={match.away} size={34} />
      </div>
      <div className="pool-picks" role="group" aria-label={`Pronóstico ${homeName} vs ${awayName}`}>
        {OUTCOMES.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`pool-pick${outcome === o.id ? ' on' : ''}`}
            onClick={() => setOutcome(match.id, o.id)}
            disabled={isLocked}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="pool-score">
        <label>
          <span className="mono-label">{match.home}</span>
          <input
            inputMode="numeric"
            value={scoreValue(homeGoals)}
            onChange={(e) => setScore(match.id, 'homeGoals', parseScore(e.target.value))}
            aria-label={`Goles ${homeName}`}
            disabled={isLocked}
          />
        </label>
        <span className="mono-label">Predicho</span>
        <label>
          <span className="mono-label">{match.away}</span>
          <input
            inputMode="numeric"
            value={scoreValue(awayGoals)}
            onChange={(e) => setScore(match.id, 'awayGoals', parseScore(e.target.value))}
            aria-label={`Goles ${awayName}`}
            disabled={isLocked}
          />
        </label>
      </div>

      {isLocked && (
        <div className="pool-match-real-score">
          <span>Resultado Real</span>
          <strong>{match.homeGoals ?? 0} - {match.awayGoals ?? 0}</strong>
        </div>
      )}
    </div>
  );
}
