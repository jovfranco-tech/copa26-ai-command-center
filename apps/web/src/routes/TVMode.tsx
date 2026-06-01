import { useEffect, useMemo, useState } from 'react';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull } from '@worldcup/shared';
import { MatchdayHero } from '@/components/MatchdayHero';
import { TeamCrest, TeamKit } from '@/components/identity';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import { focusMatch, sortMatches, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';

export function TVMode() {
  const { data, isLoading } = useMatches();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const matches = useMemo(() => data?.items ?? [], [data]);
  const focus = useMemo(() => focusMatch(matches), [matches]);
  const next = useMemo(() => sortMatches(matches).filter((m) => m.status === 'UPCOMING').slice(0, 6), [matches]);

  if (isLoading) return <p className="muted">Cargando modo TV...</p>;

  return (
    <div className="page-fade tv-mode">
      <div className="tv-header">
        <div>
          <span className="mono-label">Modo TV</span>
          <h2>Centro de partido en pantalla grande</h2>
        </div>
        <div className="tv-clock">
          <span className="num">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <small>{now.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}</small>
        </div>
      </div>

      <MatchdayHero match={focus} />

      <div className="tv-grid">
        {next.map((m) => {
          const weather = weatherSummary(m.id);
          return (
            <div key={m.id} className="tv-match-card card">
              <div className="row gap-8 wrap">
                <StatusBadge status={m.status} minute={m.minute} time={m.time} />
                <span className="mono-label">{fmtFull(m.date)}</span>
              </div>
              <div className="tv-match-teams">
                <span>
                  <TeamCrest code={m.home} size={42} />
                  <strong>{teams[m.home]?.name ?? m.home}</strong>
                  <TeamKit code={m.home} size={34} />
                </span>
                <b className="num">{m.time}</b>
                <span>
                  <TeamCrest code={m.away} size={42} />
                  <strong>{teams[m.away]?.name ?? m.away}</strong>
                  <TeamKit code={m.away} size={34} />
                </span>
              </div>
              <div className="tv-match-foot">
                <span><Icon name="pin" size={13} /> {venues[m.venue]?.stadium ?? 'Sede'}</span>
                <span><Icon name="rain" size={13} /> {weather.label}</span>
                <span>{venueTimeLabel(m)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

