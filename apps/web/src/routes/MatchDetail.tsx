import { useState, type CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge, Empty, cn } from '@worldcup/ui';
import { fmtFull, type MatchEvent, type Player } from '@worldcup/shared';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { TeamCrest, TeamFlag, TeamKit, FavStar } from '@/components/identity';
import { useMatch, usePlayers, useTeamsMap } from '@/hooks';
import { h2hSummary, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';

type Tab = 'events' | 'lineups' | 'stats' | 'intel';

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
  const weather = weatherSummary(m.id);
  const h2h = h2hSummary(m.home, m.away);
  const source = matchSourceInfo(m);
  const photo = venuePhotoSrc(m.venue);

  return (
    <div className="page-fade">
      <div
        className="card match-detail-hero"
        style={photo ? { '--match-hero-img': `url(${photo})` } as React.CSSProperties : undefined}
      >
        <div className="match-detail-bg" />
        <div style={{ height: 5, background: `linear-gradient(90deg, ${teams[m.home]?.colorA ?? '#888'}, ${teams[m.away]?.colorB ?? '#888'})` }} />
        <div className="card-pad">
          <div className="row gap-8" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="row gap-8 wrap">
              <span className="mono-label">
                {m.stage} · {m.round}
              </span>
              <DataSourceBadge {...source} compact />
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
              <TeamKit code={m.home} size={46} />
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
              <div className="mono-label" style={{ marginTop: 4 }}>
                {venueTimeLabel(m)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamCrest code={m.away} size={64} />
              <span style={{ fontWeight: 700 }}>{awayName}</span>
              <TeamFlag code={m.away} size={16} />
              <TeamKit code={m.away} size={46} />
            </div>
          </div>

          <div className="row gap-12 wrap muted" style={{ justifyContent: 'center', marginTop: 14, fontSize: 12, alignItems: 'center' }}>
            <span className="row gap-6">
              <Icon name="pin" size={13} /> {data?.venue?.stadium ?? '—'}, {data?.venue?.city ?? '—'}
            </span>
            <span className="match-chip" title={`${weather.source} · ${weather.date}`}>
              <Icon name="rain" size={13} /> {weather.label}
            </span>
            <span className="match-chip" title={`${h2h.source} · ${h2h.date}`}>
              <Icon name="activity" size={13} /> {h2h.label}
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

      <div className="row gap-6 match-detail-tabs" style={{ marginBottom: 14 }}>
        {(['events', 'lineups', 'stats', 'intel'] as Tab[]).map((t) => (
          <button key={t} type="button" className={cn('pill', tab === t && 'on')} onClick={() => setTab(t)}>
            {t === 'events' ? 'Eventos' : t === 'lineups' ? 'Alineaciones' : t === 'stats' ? 'Estadísticas' : 'Fuentes'}
          </button>
        ))}
      </div>

      {tab === 'events' && <EventsTimeline events={events} homeCode={m.home} />}
      {tab === 'lineups' && <Lineups homeCode={m.home} awayCode={m.away} />}
      {tab === 'stats' && <MatchStats m={m} pH={pH} />}
      {tab === 'intel' && <MatchIntel source={source} weather={weather} h2h={h2h} />}
    </div>
  );
}

function MatchIntel({
  source,
  weather,
  h2h,
}: {
  source: ReturnType<typeof matchSourceInfo>;
  weather: ReturnType<typeof weatherSummary>;
  h2h: ReturnType<typeof h2hSummary>;
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
      <IntelCard title="Calendario / resultado" data={source} />
      <IntelCard title="Clima" data={{ label: weather.label, source: weather.source, date: weather.date, confidence: weather.confidence }} />
      <IntelCard title="Historial H2H" data={h2h} />
    </div>
  );
}

function IntelCard({ title, data }: { title: string; data: { label: string; source: string; date: string; confidence: 'Alta' | 'Media' | 'Pendiente' | 'Manual' } }) {
  return (
    <div className="card card-pad source-card">
      <span className="mono-label">{title}</span>
      <strong>{data.label}</strong>
      <DataSourceBadge {...data} />
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
  const homePlayers = home?.items ?? [];
  const awayPlayers = away?.items ?? [];

  return (
    <div className="match-lineups-layout">
      <LineupPitch homeCode={homeCode} awayCode={awayCode} homePlayers={homePlayers} awayPlayers={awayPlayers} />
      <div className="grid squad-list-grid">
        <SquadList code={homeCode} players={homePlayers} />
        <SquadList code={awayCode} players={awayPlayers} />
      </div>
    </div>
  );
}

function LineupPitch({
  homeCode,
  awayCode,
  homePlayers,
  awayPlayers,
}: {
  homeCode: string;
  awayCode: string;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const teams = useTeamsMap();
  const homeTeam = teams[homeCode];
  const awayTeam = teams[awayCode];
  const homeXI = selectLineup(homePlayers);
  const awayXI = selectLineup(awayPlayers);

  return (
    <section className="card lineup-pitch-card">
      <div className="lineup-pitch-head">
        <TeamBrief code={homeCode} label={homeTeam?.name ?? homeCode} formation={formationLabel(homeXI)} />
        <span className="mono-label">Formación estimada</span>
        <TeamBrief code={awayCode} label={awayTeam?.name ?? awayCode} formation={formationLabel(awayXI)} align="right" />
      </div>
      <div
        className="lineup-pitch-board"
        style={{
          '--home-primary': homeTeam?.colorA ?? 'var(--gold)',
          '--home-secondary': homeTeam?.colorB ?? 'var(--gold-2)',
          '--away-primary': awayTeam?.colorA ?? 'var(--gold)',
          '--away-secondary': awayTeam?.colorB ?? 'var(--gold-2)',
        } as CSSProperties}
      >
        <PitchMarkings />
        <TeamShape code={awayCode} players={awayXI} side="away" />
        <div className="lineup-center-label mono-label">Medio campo</div>
        <TeamShape code={homeCode} players={homeXI} side="home" />
      </div>
    </section>
  );
}

function TeamBrief({
  code,
  label,
  formation,
  align = 'left',
}: {
  code: string;
  label: string;
  formation: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={`lineup-team-brief ${align}`}>
      <TeamCrest code={code} size={26} />
      <div>
        <strong>{label}</strong>
        <span className="mono-label">{formation}</span>
      </div>
    </div>
  );
}

function TeamShape({ code, players, side }: { code: string; players: Player[]; side: 'home' | 'away' }) {
  const rows = side === 'away' ? ['GK', 'DF', 'MF', 'FW'] : ['FW', 'MF', 'DF', 'GK'];
  return (
    <div className={`lineup-team-shape ${side}`}>
      {rows.map((pos) => (
        <div key={`${code}-${side}-${pos}`} className={`lineup-line lineup-line-${pos}`}>
          {players
            .filter((p) => p.pos === pos)
            .map((p) => (
              <span key={p.id} className="lineup-player-chip">
                <span className="num">{p.number ?? '—'}</span>
                <b>{shortPlayerName(p.name)}</b>
                <small>{p.pos}</small>
              </span>
            ))}
        </div>
      ))}
    </div>
  );
}

function PitchMarkings() {
  return (
    <svg className="lineup-pitch-markings" viewBox="0 0 100 150" aria-hidden="true">
      <rect x="4" y="4" width="92" height="142" rx="3" />
      <line x1="4" x2="96" y1="75" y2="75" />
      <circle cx="50" cy="75" r="15" />
      <rect x="24" y="4" width="52" height="22" />
      <rect x="36" y="4" width="28" height="9" />
      <rect x="24" y="124" width="52" height="22" />
      <rect x="36" y="137" width="28" height="9" />
    </svg>
  );
}

function selectLineup(players: Player[]): Player[] {
  const picked = new Map<string, Player>();
  const take = (pos: Player['pos'], count: number) => {
    players
      .filter((p) => p.pos === pos)
      .sort(playerSort)
      .slice(0, count)
      .forEach((p) => picked.set(p.id, p));
  };

  take('GK', 1);
  take('DF', 4);
  take('MF', 3);
  take('FW', 3);

  for (const p of [...players].sort(playerSort)) {
    if (picked.size >= 11) break;
    picked.set(p.id, p);
  }

  return [...picked.values()];
}

function playerSort(a: Player, b: Player): number {
  const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
  return order[a.pos] - order[b.pos] || (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name);
}

function formationLabel(players: Player[]): string {
  const df = players.filter((p) => p.pos === 'DF').length;
  const mf = players.filter((p) => p.pos === 'MF').length;
  const fw = players.filter((p) => p.pos === 'FW').length;
  return df && mf && fw ? `${df}-${mf}-${fw}` : 'Pendiente';
}

function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : name;
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
