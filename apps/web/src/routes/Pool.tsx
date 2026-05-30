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

  const matches = useMemo(() => {
    const items = (data?.items ?? []).filter((m) => m.status === 'UPCOMING');
    return items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [data]);

  const visible = view === 'next' ? matches.slice(0, 24) : matches;
  const picked = matches.filter((m) => pool.picks[m.id]?.outcome).length;
  const completeScores = matches.filter((m) => {
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

      <div className="pool-summary">
        <SummaryTile icon="check" label="Partidos elegidos" value={`${picked}/${matches.length}`} />
        <SummaryTile icon="target" label="Marcadores" value={`${completeScores}/${matches.length}`} />
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

      {isLoading ? (
        <p className="muted">Cargando quiniela…</p>
      ) : !visible.length ? (
        <Empty icon="trophy" title="Sin partidos para pronosticar" text="Cuando haya calendario pendiente aparecerá aquí." />
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
  const pick = usePool((s) => s.picks[match.id] ?? {});
  const setOutcome = usePool((s) => s.setOutcome);
  const setScore = usePool((s) => s.setScore);
  const clearMatch = usePool((s) => s.clearMatch);

  const scoreValue = (v: number | undefined) => (v == null ? '' : String(v));
  const parseScore = (value: string) => {
    if (value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(30, Math.round(n))) : undefined;
  };

  return (
    <div className="card pool-match">
      <div className="pool-match-head">
        <span className="badge up">{match.time}</span>
        <span className="mono-label">{fmtDay(match.date)}</span>
        <button type="button" className="fav-btn" onClick={() => clearMatch(match.id)} aria-label="Limpiar partido">
          <Icon name="close" size={14} />
        </button>
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
            className={`pool-pick${pick.outcome === o.id ? ' on' : ''}`}
            onClick={() => setOutcome(match.id, o.id)}
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
            value={scoreValue(pick.homeGoals)}
            onChange={(e) => setScore(match.id, 'homeGoals', parseScore(e.target.value))}
            aria-label={`Goles ${homeName}`}
          />
        </label>
        <span className="mono-label">Marcador</span>
        <label>
          <span className="mono-label">{match.away}</span>
          <input
            inputMode="numeric"
            value={scoreValue(pick.awayGoals)}
            onChange={(e) => setScore(match.id, 'awayGoals', parseScore(e.target.value))}
            aria-label={`Goles ${awayName}`}
          />
        </label>
      </div>
    </div>
  );
}
