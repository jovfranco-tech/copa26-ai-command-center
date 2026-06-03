import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Section, StatTile, Skeleton } from '@worldcup/ui';
import { avg, fmtGD, type Match } from '@worldcup/shared';
import { MatchCard, MatchRow, Ticker, PlayerMini } from '@/components/cards';
import { TeamCrest } from '@/components/identity';
import { MatchdayHero } from '@/components/MatchdayHero';
import { MockBanner } from '@/components/MockBanner';
import { TournamentTimeline } from '@/components/TournamentTimeline';
import { AIBrief, FamilyLaunchPanel, LiveActivityWidget, OperationalPulse } from '@/components/dashboard';
import { useMatches, useStandings, useStats, useSyncStatus, useTeams } from '@/hooks';
import { focusMatch, lockLabel, weatherSummary } from '@/lib/matchMeta';
import { useFavorites } from '@/store/favorites';
import { usePool } from '@/store/pool';

/** Derive the tournament "focus day": a live day, else latest played, else next up. */
function focusDate(matches: Match[]): string {
  const live = matches.find((m) => m.status === 'LIVE');
  if (live) return live.date;
  const played = matches.filter((m) => m.status === 'FT').map((m) => m.date).sort();
  if (played.length) return played[played.length - 1]!;
  const up = matches.filter((m) => m.status === 'UPCOMING').map((m) => m.date).sort();
  return up[0] ?? '';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: matchData, isLoading } = useMatches();
  const { data: stats } = useStats();
  const { data: standings } = useStandings();
  const { data: sync } = useSyncStatus();
  const { data: teamsData } = useTeams();
  const favTeams = useFavorites((s) => s.teams);
  const favPlayers = useFavorites((s) => s.players);
  const favMatches = useFavorites((s) => s.matches);
  const pool = usePool();

  const matches = useMemo(() => matchData?.items ?? [], [matchData]);
  const day = useMemo(() => focusDate(matches), [matches]);
  const today = matches.filter((m) => m.date === day);
  const live = matches.filter((m) => m.status === 'LIVE');
  const heroMatch = useMemo(() => focusMatch(matches), [matches]);
  const upcoming = matches.filter((m) => m.status === 'UPCOMING').slice(0, 5);
  const results = matches.filter((m) => m.status === 'FT').slice(-6).reverse();
  const played = matches.filter((m) => m.status === 'FT').length;
  const goals = matches
    .filter((m) => m.status === 'FT')
    .reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const scorers = stats?.topScorers.slice(0, 5) ?? [];

  const tickerItems = [...live, ...today.filter((m) => m.status !== 'LIVE')].slice(0, 8);

  if (isLoading) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <Skeleton h={90} />
        <Skeleton h={220} />
      </div>
    );
  }

  return (
      <div className="page-fade">
        <MockBanner />
        <MatchdayHero match={heroMatch} />
        <FamilyLaunchPanel match={heroMatch} />
        <ProactiveAlerts match={heroMatch} picks={pool.picks} favoritesCount={favTeams.length + favPlayers.length + favMatches.length} />
        <OperationalPulse
          matches={matches}
          teams={teamsData?.items ?? []}
          picks={pool.picks}
          favoritesCount={favTeams.length + favPlayers.length + favMatches.length}
        />

        <div className="stat-strip" style={{ marginBottom: 18 }}>
        <StatTile icon="ball" label="Goles" value={goals} sub="Torneo" spark={[40, 55, 38, 70, 62, 90, 100]} />
        <StatTile icon="whistle" label="Jugados" value={played} sub={`de ${matches.length}`} />
        <StatTile icon="flame" label="Goles/partido" value={avg(goals, played)} sub="Fase de grupos" accent="var(--pos)" />
        <StatTile
          icon="target"
          label="En vivo"
          value={live.length}
          sub={live.length ? 'En juego' : 'Ninguno'}
          accent={live.length ? 'var(--live)' : undefined}
        />
        <StatTile icon="star" label="Seguimiento" value={favTeams.length + favPlayers.length} sub="Selecciones + jugadores" />
      </div>

      <div className="home-grid">
        <div className="grid">
          <AIBrief day={day} todayCount={today.length} liveCount={live.length} />

          <Section title="En vivo y hoy" label="Marcador">
            {tickerItems.length ? (
              <Ticker items={tickerItems} />
            ) : (
              <p className="muted" style={{ fontSize: 12.5 }}>
                Sin partidos para el día destacado.
              </p>
            )}
          </Section>

          <Section
            title="Partidos de hoy"
            label={day}
            action={
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Centro de partidos <Icon name="chevR" size={13} />
              </button>
            }
          >
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))' }}>
              {today.slice(0, 4).map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </Section>

          <div className="card">
            <div className="card-hd">
              <Icon name="target" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Mi seguimiento</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/favorites' })}>
                Gestionar
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 8 }}>
              {favTeams.length + favPlayers.length + favMatches.length === 0 ? (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Marca selecciones, jugadores y partidos para armar tu seguimiento.
                </p>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                  {favTeams.map((c) => (
                    <div
                      key={c}
                      className="row gap-8 clickable"
                      style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
                      onClick={() => navigate({ to: '/teams/$code', params: { code: c } })}
                    >
                      <TeamCrest code={c} size={26} />
                      <span style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Section title="Últimos resultados" label="Final">
            <div className="card card-pad">
              {results.length ? (
                results.map((m) => <MatchRow key={m.id} m={m} />)
              ) : (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Aún no se ha jugado ningún partido.
                </p>
              )}
            </div>
          </Section>

          <TournamentTimeline matches={matches} />
        </div>

        {/* rail */}
        <div className="rail">
          <LiveActivityWidget />
          <SyncCard sync={sync} />

          {standings && (
            <div className="card">
              <div className="card-hd">
                <Icon name="standings" size={15} style={{ color: 'var(--gold)' }} />
                <h3>Resumen de grupo</h3>
                <span className="spacer" />
                <button type="button" className="card-link" onClick={() => navigate({ to: '/standings' })}>
                  Tablas completas
                </button>
              </div>
              <div className="card-pad" style={{ paddingTop: 4 }}>
                {(standings.groups.A ?? []).slice(0, 4).map((r, i) => (
                  <div
                    key={r.team}
                    className="row gap-8 clickable"
                    style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}
                    onClick={() => navigate({ to: '/teams/$code', params: { code: r.team } })}
                  >
                    <span className="rank num" style={{ width: 18 }}>
                      {i + 1}
                    </span>
                    <TeamCrest code={r.team} size={20} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 12.5 }}>{r.team}</span>
                    <span className={`num ${r.GD > 0 ? 'gd-pos' : r.GD < 0 ? 'gd-neg' : ''}`} style={{ fontSize: 12 }}>
                      {fmtGD(r.GD)}
                    </span>
                    <span className="num tx-gold" style={{ fontWeight: 700 }}>
                      {r.Pts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-hd">
              <Icon name="ball" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Goleadores</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/stats' })}>
                Todos
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {scorers.length ? (
                scorers.map((p, i) => (
                  <PlayerMini key={p.id} p={p} rank={i + 1} metric={(x) => `${x.goals}G`} />
                ))
              ) : (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Sin goleadores todavía.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <Icon name="clock" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Próximos</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Calendario
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              {upcoming.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProactiveAlerts({
  match,
  picks,
  favoritesCount,
}: {
  match: Match | null;
  picks: Record<string, { outcome?: string; homeGoals?: number; awayGoals?: number }>;
  favoritesCount: number;
}) {
  const navigate = useNavigate();
  if (!match) return null;
  const pick = picks[match.id];
  const weather = weatherSummary(match.id);
  const alerts = [
    {
      icon: 'target' as const,
      title: pick?.outcome ? 'Pick activo' : 'Pick pendiente',
      text: pick?.homeGoals != null && pick.awayGoals != null ? `Tu marcador: ${pick.homeGoals}-${pick.awayGoals}` : 'Captura marcador antes del cierre.',
      action: 'Abrir quiniela',
      to: '/pool' as const,
    },
    {
      icon: 'rain' as const,
      title: 'Clima a vigilar',
      text: `${weather.label} · ${weather.confidence}`,
      action: 'Ver partido',
      to: '/matches' as const,
    },
    {
      icon: 'star' as const,
      title: 'Seguimiento',
      text: favoritesCount ? `${favoritesCount} favoritos activos.` : 'Marca equipos o jugadores para alertas más útiles.',
      action: 'Favoritos',
      to: '/favorites' as const,
    },
  ];
  return (
    <div className="proactive-alert-strip">
      <div>
        <span className="mono-label">Alertas proactivas</span>
        <strong>{lockLabel(match)}</strong>
      </div>
      {alerts.map((alert) => (
        <button key={alert.title} type="button" className="proactive-alert" onClick={() => navigate({ to: alert.to })}>
          <Icon name={alert.icon} size={14} />
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.text}</small>
          </span>
          <em>{alert.action}</em>
        </button>
      ))}
    </div>
  );
}

function SyncCard({ sync }: { sync: ReturnType<typeof useSyncStatus>['data'] }) {
  const navigate = useNavigate();
  const meta = sync?.meta;
  const isMock = sync?.source === 'mock';
  return (
    <div className="card">
      <div className="card-hd">
        <span className={isMock ? 'dot-warn' : 'dot-ok'} />
        <h3>Datos locales</h3>
        <span className="spacer" />
        <button type="button" className="card-link" onClick={() => navigate({ to: '/data' })}>
          Revisar
        </button>
      </div>
      <div className="card-pad" style={{ paddingTop: 4 }}>
        <div className="sync-row">
          <span className="k">Estado</span>
          <span className="badge gold">{meta?.cacheStatus ?? 'Datos abiertos'}</span>
        </div>
        <div className="sync-row">
          <span className="k">Fuente</span>
          <span className="num" style={{ fontSize: 12 }}>
            {sync?.source === 'sqlite' ? 'SQLite local' : 'Datos del torneo'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Actualizado</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.lastSync ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Dataset</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.db ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Banderas</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta ? `${meta.assets.flags} selecciones` : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}
