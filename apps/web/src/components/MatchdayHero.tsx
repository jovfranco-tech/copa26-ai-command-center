import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull, type Match } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit } from '@/components/identity';
import { useTeamsMap, useVenuesMap } from '@/hooks';
import { h2hSummary, isMatchLocked, lockLabel, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { shareTextCard } from '@/lib/shareCards';
import { usePool } from '@/store/pool';
import { DataSourceBadge } from './DataSourceBadge';

export function MatchdayHero({ match, variant = 'featured' }: { match: Match | null; variant?: 'featured' | 'compact' }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const picks = usePool((s) => s.picks);

  const meta = useMemo(() => (match ? matchSourceInfo(match) : null), [match]);
  const weather = useMemo(() => (match ? weatherSummary(match.id) : null), [match]);
  const h2h = useMemo(() => (match ? h2hSummary(match.home, match.away) : null), [match]);
  const countdown = useMemo(() => (match ? countdownLabel(match, now) : ''), [match, now]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  if (!match) return null;

  const home = teams[match.home];
  const away = teams[match.away];
  const venue = venues[match.venue];
  const photo = venuePhotoSrc(match.venue);
  const played = match.status !== 'UPCOMING';
  const pick = picks[match.id];
  const pickComplete = pick?.homeGoals != null && pick?.awayGoals != null;
  const locked = isMatchLocked(match);
  const pickLabel = pickComplete
    ? `${pick.homeGoals}-${pick.awayGoals}`
    : pick?.outcome
      ? outcomeName(pick.outcome)
      : 'Pendiente';
  const nextAction = played ? 'Revisar resultado' : pickComplete ? 'Ajustar predicción' : 'Capturar pick';
  const goNextAction = () => {
    if (played) {
      navigate({ to: '/matches/$matchId', params: { matchId: match.id } });
      return;
    }
    navigate({ to: '/pool' });
  };

  const shareMatch = async () => {
    setSharing(true);
    try {
      await shareTextCard({
        title: `${home?.name ?? match.home} vs ${away?.name ?? match.away}`,
        subtitle: `${fmtFull(match.date)} · ${venueTimeLabel(match)}`,
        lines: [
          `${venue?.stadium ?? 'Sede por confirmar'}, ${venue?.city ?? ''}`,
          weather ? `Clima: ${weather.label}` : 'Clima pendiente',
          h2h?.label ?? 'Historial pendiente',
          played ? `Marcador: ${match.homeGoals ?? 0}-${match.awayGoals ?? 0}` : 'Listo para quiniela',
        ],
        fileName: `partido-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className={`matchday-hero ${variant}`} style={photo ? { '--hero-img': `url(${photo})` } as React.CSSProperties : undefined}>
      <div className="matchday-bg" />
      <div className="matchday-content">
        <div className="matchday-copy">
          <div className="row gap-8 wrap">
            <StatusBadge status={match.status} minute={match.minute} time={match.time} />
            <span className="mono-label">{match.stage} · {match.round}</span>
            {meta && <DataSourceBadge {...meta} compact />}
          </div>
          <h2>Día de partido</h2>
          <p>{venue?.stadium ?? 'Sede por confirmar'} · {venue?.city ?? 'Ciudad por confirmar'} · {fmtFull(match.date)}</p>
          <div className="matchday-command-strip">
            <span><Icon name="clock" size={13} /> Cuenta regresiva <strong>{countdown}</strong></span>
            <span><Icon name="rain" size={13} /> {weather?.label ?? 'Clima pendiente'}</span>
            <span><Icon name="shield" size={13} /> {meta?.confidence ?? 'Confianza pendiente'}</span>
          </div>
        </div>

        <div className="matchday-scoreboard">
          <div className="matchday-team">
            <TeamCrest code={match.home} size={58} />
            <TeamFlag code={match.home} size={15} />
            <strong>{home?.name ?? match.home}</strong>
            <TeamKit code={match.home} size={42} />
          </div>
          <div className="matchday-center">
            {played ? (
              <span className="matchday-score num">{match.homeGoals ?? 0}<b>–</b>{match.awayGoals ?? 0}</span>
            ) : (
              <>
                <span className="matchday-time num">{match.time}</span>
                <span className="mono-label">{venueTimeLabel(match)}</span>
              </>
            )}
          </div>
          <div className="matchday-team away">
            <TeamCrest code={match.away} size={58} />
            <TeamFlag code={match.away} size={15} />
            <strong>{away?.name ?? match.away}</strong>
            <TeamKit code={match.away} size={42} />
          </div>
        </div>

        <div className="matchday-intel">
          <InfoTile icon="rain" label="Clima" value={weather?.label ?? 'Pendiente'} sub={weather?.detail ?? 'Forecast cercano pendiente'} />
          <InfoTile icon="pin" label="Sede" value={venue?.stadium ?? 'Por confirmar'} sub={venue?.city ?? 'Ciudad pendiente'} />
          <InfoTile icon="activity" label="Historial" value={h2h?.label ?? 'Pendiente'} sub={h2h?.source ?? 'Pipeline H2H'} />
        </div>

        <div className="matchday-focus-panel">
          <div>
            <span className="mono-label">Tu quiniela</span>
            <strong>{pickLabel}</strong>
            <small>{pickComplete ? 'Lista para compartir' : 'Falta cerrar ganador y marcador'}</small>
          </div>
          <div>
            <span className="mono-label">Cierre</span>
            <strong>{locked || played ? 'Cerrado' : 'Abierto'}</strong>
            <small>{lockLabel(match)}</small>
          </div>
          <div>
            <span className="mono-label">Confianza datos</span>
            <strong>{meta?.confidence ?? 'Pendiente'}</strong>
            <small>{meta?.source ?? 'Dataset local'}</small>
          </div>
          <button type="button" className="btn gold" onClick={goNextAction}>
            <Icon name={played ? 'calendar' : 'target'} size={15} />
            {nextAction}
          </button>
        </div>

        <div className="matchday-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={15} /> Ir a quiniela
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: match.id } })}>
            <Icon name="calendar" size={15} /> Ver partido
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/tv' })}>
            <Icon name="present" size={15} /> Modo TV
          </button>
          <button type="button" className="btn ghost" onClick={shareMatch} disabled={sharing}>
            <Icon name="share" size={15} /> {sharing ? 'Creando...' : 'Compartir'}
          </button>
        </div>
      </div>
    </section>
  );
}

function outcomeName(outcome: 'home' | 'draw' | 'away'): string {
  if (outcome === 'home') return 'Gana local';
  if (outcome === 'away') return 'Gana visita';
  return 'Empate';
}

function countdownLabel(match: Match, now: number): string {
  if (match.status === 'LIVE') return 'En juego';
  if (match.status === 'FT') return 'Finalizado';
  const kickoff = Date.parse(`${match.date}T${match.time || '00:00'}:00`);
  if (!Number.isFinite(kickoff)) return 'Por confirmar';
  const diff = kickoff - now;
  if (diff <= 0) return 'Por iniciar';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function InfoTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="matchday-info-tile">
      <Icon name={icon} size={15} />
      <span className="mono-label">{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
