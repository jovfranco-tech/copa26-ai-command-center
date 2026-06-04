import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull, fmtLongDate, fmtTime, type Match } from '@worldcup/shared';
import { MatchdayHero } from '@/components/MatchdayHero';
import { TeamCrest, TeamKit } from '@/components/identity';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import {
  broadcastImportanceLabel,
  broadcastImportanceScore,
  featuredBroadcastMatches,
  getBroadcastGuide,
  type BroadcastProvider,
} from '@/lib/broadcasts';
import { focusMatch, sortMatches, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';

export function TVMode() {
  const navigate = useNavigate();
  const { data, isLoading } = useMatches();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const matches = useMemo(() => data?.items ?? [], [data]);
  const focus = useMemo(() => focusMatch(matches), [matches]);
  const next = useMemo(() => sortMatches(matches).filter((m) => m.status === 'UPCOMING').slice(0, 6), [matches]);
  const featuredBroadcasts = useMemo(() => featuredBroadcastMatches(matches, 6), [matches]);

  if (isLoading) return <p className="muted">Cargando modo TV...</p>;

  return (
    <div className="page-fade tv-mode">
      <div className="tv-header">
        <div>
          <span className="mono-label">Modo TV</span>
          <h2>Centro de partido en pantalla grande</h2>
        </div>
        <div className="tv-clock">
          <span className="num">{fmtTime(now)}</span>
          <small>{fmtLongDate(now.toISOString().slice(0, 10))}</small>
        </div>
      </div>

      <TVBroadcastPanel match={focus} featured={featuredBroadcasts} />
      <MatchdayHero match={focus} />
      <TVFamilyStrip match={focus} onPool={() => navigate({ to: '/pool' })} onData={() => navigate({ to: '/data' })} />

      <div className="tv-grid">
        {next.map((m) => {
          const weather = weatherSummary(m.id);
          return (
            <div key={m.id} className={`tv-match-card card${broadcastImportanceScore(m) >= 45 ? ' broadcast-priority' : ''}`}>
              <div className="row gap-8 wrap">
                <StatusBadge status={m.status} minute={m.minute} time={m.time} />
                <span className="mono-label">{fmtFull(m.date)}</span>
                {broadcastImportanceScore(m) >= 45 && <span className="match-chip">TV destacada</span>}
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

function TVBroadcastPanel({ match, featured }: { match: Match | null; featured: Match[] }) {
  const teams = useTeamsMap();
  const guide = useMemo(() => getBroadcastGuide(match), [match]);
  const matchTitle = match ? `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}` : 'Partido destacado';
  return (
    <section className="tv-broadcast-panel card">
      <div className="tv-broadcast-main">
        <div className="tv-broadcast-screen" aria-label="Acceso a transmisión oficial">
          <div className="tv-broadcast-glow" />
          <div className="tv-broadcast-play" aria-hidden="true" style={{ pointerEvents: 'none', opacity: 0.4 }}>
            <Icon name="play" size={30} />
          </div>
          <span className="mono-label">Transmisión oficial</span>
          <strong>{matchTitle}</strong>
          <small>{guide.headline} · prioridad {guide.priority} · hubs autorizados</small>
        </div>

        <div className="tv-broadcast-copy">
          <span className="mono-label">Dónde verlo online</span>
          <h3>{matchTitle}</h3>
          <p>{guide.note}</p>
          <div className="tv-broadcast-actions">
            {guide.providers.slice(0, 3).map((provider, index) => (
              <a key={provider.id} className={`btn ${index === 0 ? 'gold' : 'ghost'}`} href={provider.url} target="_blank" rel="noreferrer">
                <Icon name={index === 0 ? 'play' : 'arrowR'} size={14} />
                {provider.label}
              </a>
            ))}
          </div>
          <div className="tv-provider-grid">
            {guide.providers.map((provider) => (
              <BroadcastProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
          <div className="tv-broadcast-source">
            <span>Fuentes revisables:</span>
            {guide.providers.map((provider) => (
              <a key={provider.id} href={provider.sourceUrl} target="_blank" rel="noreferrer">
                {provider.sourceLabel}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="tv-featured-strip">
        <div>
          <span className="mono-label">Juegos importantes</span>
          <strong>Acceso rápido para ver en vivo</strong>
        </div>
        <div className="tv-featured-list">
          {featured.map((item) => (
            <a key={item.id} href={guide.providers[0]?.url} target="_blank" rel="noreferrer" title="Abrir proveedor oficial">
              <span>{broadcastImportanceLabel(item, teams)}</span>
              <b>{teams[item.home]?.name ?? item.home} vs {teams[item.away]?.name ?? item.away}</b>
              <small>{fmtFull(item.date)} · {item.time}</small>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function BroadcastProviderCard({ provider }: { provider: BroadcastProvider }) {
  return (
    <a className="tv-provider-card" href={provider.url} target="_blank" rel="noreferrer">
      <span className="mono-label">{provider.region} · {provider.language}</span>
      <strong>{provider.label}</strong>
      <small>{provider.note}</small>
      <em>
        Abrir {provider.platform}
        <Icon name="arrowR" size={12} />
      </em>
    </a>
  );
}

function TVFamilyStrip({ match, onPool, onData }: { match: Match | null; onPool: () => void; onData: () => void }) {
  return (
    <div className="tv-family-strip card">
      <div>
        <span className="mono-label">Vista para sala</span>
        <strong>{match ? `${match.home} vs ${match.away}` : 'Partido destacado'}</strong>
        <p>Ideal para dejar la app abierta durante la previa: próxima sede, clima, kits y acceso a quiniela.</p>
      </div>
      <button type="button" className="btn gold" onClick={onPool}>
        <Icon name="trophy" size={15} /> Abrir quiniela
      </button>
      <button type="button" className="btn ghost" onClick={onData}>
        <Icon name="database" size={15} /> Salud de datos
      </button>
    </div>
  );
}
