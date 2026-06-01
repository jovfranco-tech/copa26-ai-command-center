import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull, type Match } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit } from '@/components/identity';
import { useTeamsMap, useVenuesMap } from '@/hooks';
import { h2hSummary, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { shareTextCard } from '@/lib/shareCards';
import { DataSourceBadge } from './DataSourceBadge';

export function MatchdayHero({ match }: { match: Match | null }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [sharing, setSharing] = useState(false);

  const meta = useMemo(() => (match ? matchSourceInfo(match) : null), [match]);
  const weather = useMemo(() => (match ? weatherSummary(match.id) : null), [match]);
  const h2h = useMemo(() => (match ? h2hSummary(match.home, match.away) : null), [match]);

  if (!match) return null;

  const home = teams[match.home];
  const away = teams[match.away];
  const venue = venues[match.venue];
  const photo = venuePhotoSrc(match.venue);
  const played = match.status !== 'UPCOMING';

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
          played ? `Marcador: ${match.homeGoals ?? 0}-${match.awayGoals ?? 0}` : 'Listo para quiniela familiar',
        ],
        fileName: `partido-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="matchday-hero" style={photo ? { '--hero-img': `url(${photo})` } as React.CSSProperties : undefined}>
      <div className="matchday-bg" />
      <div className="matchday-content">
        <div className="matchday-copy">
          <div className="row gap-8 wrap">
            <StatusBadge status={match.status} minute={match.minute} time={match.time} />
            <span className="mono-label">{match.stage} · {match.round}</span>
            {meta && <DataSourceBadge {...meta} compact />}
          </div>
          <h2>Dia de partido</h2>
          <p>{venue?.stadium ?? 'Sede por confirmar'} · {venue?.city ?? 'Ciudad por confirmar'} · {fmtFull(match.date)}</p>
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

        <div className="matchday-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={15} /> Ir a quiniela
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: match.id } })}>
            <Icon name="calendar" size={15} /> Ver partido
          </button>
          <button type="button" className="btn ghost" onClick={shareMatch} disabled={sharing}>
            <Icon name="share" size={15} /> {sharing ? 'Creando...' : 'Compartir'}
          </button>
        </div>
      </div>
    </section>
  );
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

