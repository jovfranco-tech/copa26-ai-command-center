import { useMemo, useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { fmtDay, type Match } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useTeamsMap } from '@/hooks';
import { usePool, type PoolOutcome } from '@/store/pool';

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
          <label className="mono-label" htmlFor="pool-name">
            Participante
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
