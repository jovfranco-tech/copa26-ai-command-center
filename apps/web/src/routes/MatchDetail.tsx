import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge, Empty, cn } from '@worldcup/ui';
import { fmtFull, type MatchEvent, type Player } from '@worldcup/shared';
import { TeamCrest, TeamFlag, FavStar } from '@/components/identity';
import { useMatch, usePlayers, useTeamsMap } from '@/hooks';

type Tab = 'events' | 'lineups' | 'stats';

export function MatchDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useMatch(id);
  const teams = useTeamsMap();
  const [tab, setTab] = useState<Tab>('events');

  if (isLoading) return <MatchDetailSkeleton />;
  const m = data?.item;
  if (!m) return <Empty icon="calendar" title="Partido no encontrado" text="Este partido no está en el dataset." />;

  const homeName = teams[m.home]?.name ?? m.home;
  const awayName = teams[m.away]?.name ?? m.away;
  const pH = m.possH ?? 50;
  const events = data?.events ?? [];

  return (
    <div className="page-fade">
      <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${teams[m.home]?.colorA ?? '#888'}, ${teams[m.away]?.colorB ?? '#888'})` }} />
        <div className="card-pad">
          <div className="row gap-8" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="mono-label">
              {m.stage} · {m.round}
            </span>
            <span className="row gap-8">
              <FavStar kind="matches" id={m.id} />
              <StatusBadge status={m.status} minute={m.minute} time={m.time} />
            </span>
          </div>

          <div className="match-row" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamCrest code={m.home} size={64} />
              <span style={{ fontWeight: 700 }}>{homeName}</span>
              <TeamFlag code={m.home} size={16} />
            </div>
            <div style={{ textAlign: 'center' }}>
              {m.status === 'UPCOMING' ? (
                <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                  {m.time}
                </div>
              ) : (
                <div className="num" style={{ fontSize: 44, fontWeight: 800, letterSpacing: '.02em' }}>
                  {m.homeGoals}
                  <span className="muted"> – </span>
                  {m.awayGoals}
                </div>
              )}
              <div className="mono-label" style={{ marginTop: 6 }}>
                {fmtFull(m.date)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamCrest code={m.away} size={64} />
              <span style={{ fontWeight: 700 }}>{awayName}</span>
              <TeamFlag code={m.away} size={16} />
            </div>
          </div>

          <div className="row gap-12 wrap muted" style={{ justifyContent: 'center', marginTop: 14, fontSize: 12 }}>
            <span className="row gap-6">
              <Icon name="pin" size={13} /> {data?.venue?.stadium ?? '—'}, {data?.venue?.city ?? '—'}
            </span>
            <span className="row gap-6">
              <Icon name="standings" size={13} /> Grupo {m.group}
            </span>
          </div>

          <button
            type="button"
            className="btn gold"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={() => navigate({ to: '/analyst', search: { ctx: 'match', id: m.id } })}
          >
            <Icon name="ai" size={15} /> Preguntar al analista sobre este partido
          </button>
        </div>
      </div>

      <div className="row gap-6" style={{ marginBottom: 14 }}>
        {(['events', 'lineups', 'stats'] as Tab[]).map((t) => (
          <button key={t} type="button" className={cn('pill', tab === t && 'on')} onClick={() => setTab(t)}>
            {t === 'events' ? 'Eventos' : t === 'lineups' ? 'Alineaciones' : 'Estadísticas'}
          </button>
        ))}
      </div>

      {tab === 'events' && <EventsTimeline events={events} homeCode={m.home} />}
      {tab === 'lineups' && <Lineups homeCode={m.home} awayCode={m.away} />}
      {tab === 'stats' && <MatchStats m={m} pH={pH} />}
    </div>
  );
}

function EventsTimeline({ events, homeCode }: { events: MatchEvent[]; homeCode: string }) {
  if (!events.length) return <Empty icon="whistle" title="Sin eventos" text="Aún no hay eventos para este partido." />;
  return (
    <div className="card card-pad">
      <div className="tl">
        <div className="axis" />
        {[...events]
          .sort((a, b) => a.minute - b.minute)
          .map((e) => {
            const isHome = e.team === homeCode;
            return (
              <div key={e.id} className="tl-ev">
                <div>
                  {isHome && (
                    <span className="tl-card right">
                      <Icon name="ball" size={13} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 12.5 }}>{e.description || 'Goal'}</span>
                    </span>
                  )}
                </div>
                <span className="tl-min num">{e.minute}&apos;</span>
                <div>
                  {!isHome && (
                    <span className="tl-card">
                      <Icon name="ball" size={13} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 12.5 }}>{e.description || 'Goal'}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function Lineups({ homeCode, awayCode }: { homeCode: string; awayCode: string }) {
  const { data: home } = usePlayers({ team: homeCode });
  const { data: away } = usePlayers({ team: awayCode });
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
      <SquadList code={homeCode} players={home?.items ?? []} />
      <SquadList code={awayCode} players={away?.items ?? []} />
    </div>
  );
}

function SquadList({ code, players }: { code: string; players: Player[] }) {
  const teams = useTeamsMap();
  return (
    <div className="card">
      <div className="card-hd">
        <TeamCrest code={code} size={22} />
        <h3>{teams[code]?.name ?? code}</h3>
      </div>
      <div className="card-pad" style={{ paddingTop: 6 }}>
        {players.length ? (
          players.map((p) => (
            <div key={p.id} className="row gap-8" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="num muted" style={{ width: 24 }}>
                {p.number ?? '—'}
              </span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{p.name}</span>
              <span className={`pos-tag pos-${p.pos}`}>{p.pos}</span>
            </div>
          ))
        ) : (
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Plantilla no disponible (aún no se publican las convocatorias).
          </p>
        )}
      </div>
    </div>
  );
}

function MatchStats({ m, pH }: { m: { shotsH: number | null; shotsA: number | null; shotsTH: number | null; shotsTA: number | null }; pH: number }) {
  if (m.shotsH == null)
    return <Empty icon="stats" title="Sin estadísticas" text="Las estadísticas aparecen cuando se juega el partido." />;
  const rows: Array<[string, number, number]> = [
    ['Posesión %', pH, 100 - pH],
    ['Tiros', m.shotsH ?? 0, m.shotsA ?? 0],
    ['Tiros a puerta', m.shotsTH ?? 0, m.shotsTA ?? 0],
  ];
  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map(([label, h, a]) => {
        const total = h + a || 1;
        return (
          <div key={label} className="vs-bar">
            <span className="num" style={{ textAlign: 'left' }}>
              {h}
            </span>
            <span className="mono-label" style={{ margin: 0 }}>
              {label}
            </span>
            <span className="num" style={{ textAlign: 'right' }}>
              {a}
            </span>
            <div className="track" style={{ gridColumn: '1 / -1' }}>
              <i style={{ width: `${(h / total) * 100}%`, background: 'var(--gold)' }} />
              <i style={{ width: `${(a / total) * 100}%`, background: 'var(--bg-hover)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchDetailSkeleton() {
  return (
    <div className="page-fade">
      <div className="card" style={{ overflow: 'hidden', marginBottom: 18, pointerEvents: 'none' }}>
        <div style={{ height: 5, background: 'var(--gold-soft)' }} />
        <div className="card-pad">
          <div className="row gap-8" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="skeleton" style={{ width: 120, height: 14 }} />
            <div className="skeleton" style={{ width: 80, height: 18 }} />
          </div>

          <div className="match-row" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: 80, height: 16 }} />
              <div className="skeleton" style={{ width: 32, height: 16 }} />
            </div>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="skeleton" style={{ width: 100, height: 44 }} />
              <div className="skeleton" style={{ width: 140, height: 12 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: 80, height: 16 }} />
              <div className="skeleton" style={{ width: 32, height: 16 }} />
            </div>
          </div>

          <div className="row gap-12 wrap" style={{ justifyContent: 'center', marginTop: 14 }}>
            <div className="skeleton" style={{ width: 180, height: 12 }} />
            <div className="skeleton" style={{ width: 120, height: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

