import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Empty } from '@worldcup/ui';
import type { Player } from '@worldcup/shared';
import { PlayerAvatar, TeamFlag, FavStar } from '@/components/identity';
import { MatchRow } from '@/components/cards';
import { useMatches, usePlayer, usePlayers, useTeamsMap } from '@/hooks';

export function PlayerDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = usePlayer(id);
  const teams = useTeamsMap();
  const p = data?.item;
  const { data: squadData } = usePlayers({ team: p?.team });
  const { data: allPlayers } = usePlayers();
  const { data: matches } = useMatches({ team: p?.team });
  const [compareId, setCompareId] = useState<string>('');

  const squad = useMemo(() => squadData?.items ?? [], [squadData]);
  const maxes = useMemo(() => {
    const all = squad.length ? squad : [];
    return {
      goals: Math.max(1, ...all.map((x) => x.goals)),
      assists: Math.max(1, ...all.map((x) => x.assists)),
      minutes: Math.max(1, ...all.map((x) => x.minutes)),
    };
  }, [squad]);

  if (isLoading) return <p className="muted">Cargando jugador…</p>;
  if (!p) return <Empty icon="players" title="Jugador no encontrado" text="Este jugador no está en el dataset." />;

  const t = teams[p.team];
  const compare = (allPlayers?.items ?? []).find((x) => x.id === compareId) ?? null;
  const fixtures = (matches?.items ?? []).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return (
    <div className="page-fade">
      <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${t?.colorA ?? '#888'}, ${t?.colorB ?? '#888'})` }} />
        <div className="card-pad">
          <div className="row gap-16 wrap">
            <PlayerAvatar player={p} size={84} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row gap-10">
                <h2 style={{ margin: 0, fontSize: 22 }}>{p.name}</h2>
                <span className="num muted">#{p.number ?? '—'}</span>
                <FavStar kind="players" id={p.id} size={22} />
              </div>
              <div className="row gap-8 muted" style={{ fontSize: 13, marginTop: 6 }}>
                <TeamFlag code={p.team} size={14} />
                <button
                  type="button"
                  className="card-link"
                  onClick={() => navigate({ to: '/teams/$code', params: { code: p.team } })}
                >
                  {t?.name ?? p.team}
                </button>
                <span>·</span>
                <span className={`pos-tag pos-${p.pos}`}>{p.posLong ?? p.pos}</span>
                <span>·</span>
                <span>{p.club}</span>
                <span>·</span>
                <span>{p.age ?? '—'} años</span>
              </div>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginTop: 16 }}>
            <Metric label="Goles" value={p.goals} accent="var(--gold-2)" />
            <Metric label="Asistencias" value={p.assists} />
            <Metric label="Minutos" value={p.minutes} />
            <Metric label="Amarillas" value={p.yellow} />
            <Metric label="Rojas" value={p.red} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <div className="card">
          <div className="card-hd">
            <Icon name="stats" size={15} style={{ color: 'var(--gold)' }} />
            <h3>vs squad</h3>
          </div>
          <div className="card-pad">
            <Bar label="Goals" value={p.goals} max={maxes.goals} />
            <Bar label="Assists" value={p.assists} max={maxes.assists} />
            <Bar label="Minutes" value={p.minutes} max={maxes.minutes} />
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="swap" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Quick comparison</h3>
            <span className="spacer" />
            <select
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              className="pill"
              style={{ color: 'var(--tx)' }}
            >
              <option value="">Pick a player…</option>
              {(allPlayers?.items ?? [])
                .filter((x) => x.id !== p.id)
                .slice(0, 40)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.team})
                  </option>
                ))}
            </select>
          </div>
          <div className="card-pad">
            {compare ? (
              <Comparison a={p} b={compare} />
            ) : (
              <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                Select a player to compare goals, assists and minutes.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-hd">
          <Icon name="calendar" size={15} style={{ color: 'var(--gold)' }} />
          <h3>Tournament log · {t?.name ?? p.team}</h3>
        </div>
        <div className="card-pad">
          {fixtures.length ? (
            fixtures.map((m) => <MatchRow key={m.id} m={m} />)
          ) : (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              No fixtures found.
            </p>
          )}
          <div className="mono-label" style={{ marginTop: 10 }}>
            Per-match player events appear once match-level data is ingested.
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card stat-tile">
      <span className="mono-label">{label}</span>
      <span className="stat-v" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12.5 }}>{label}</span>
        <span className="num" style={{ fontWeight: 700 }}>
          {value}
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Comparison({ a, b }: { a: Player; b: Player }) {
  const rows: Array<[string, number, number]> = [
    ['Goals', a.goals, b.goals],
    ['Assists', a.assists, b.assists],
    ['Minutes', a.minutes, b.minutes],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
        <span>{a.name}</span>
        <span className="muted">vs</span>
        <span>{b.name}</span>
      </div>
      {rows.map(([label, av, bv]) => {
        const total = av + bv || 1;
        return (
          <div key={label} className="vs-bar">
            <span className="num">{av}</span>
            <span className="mono-label" style={{ margin: 0 }}>
              {label}
            </span>
            <span className="num" style={{ textAlign: 'right' }}>
              {bv}
            </span>
            <div className="track" style={{ gridColumn: '1 / -1' }}>
              <i style={{ width: `${(av / total) * 100}%`, background: 'var(--gold)' }} />
              <i style={{ width: `${(bv / total) * 100}%`, background: 'var(--bg-hover)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
