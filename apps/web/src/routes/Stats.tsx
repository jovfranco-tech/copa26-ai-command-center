import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon, Pill, Empty } from '@worldcup/ui';
import type { Player } from '@worldcup/shared';
import { PlayerMini } from '@/components/cards';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useStats, useTeamsMap } from '@/hooks';

type Segment = 'players' | 'keepers' | 'teams';

export function Stats() {
  const { data, isLoading } = useStats();
  const teams = useTeamsMap();
  const [seg, setSeg] = useState<Segment>('players');

  if (isLoading) return <p className="muted">Cargando estadísticas…</p>;
  if (!data) return <Empty icon="stats" title="Sin estadísticas" text="Las estadísticas aparecen cuando se juegan los partidos." />;

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="row gap-6 wrap" style={{ marginBottom: 16 }}>
        {(['players', 'keepers', 'teams'] as Segment[]).map((s) => (
          <Pill key={s} on={seg === s} onClick={() => setSeg(s)}>
            {s === 'players' ? 'Jugadores' : s === 'keepers' ? 'Porteros' : 'Selecciones'}
          </Pill>
        ))}
      </div>

      {seg === 'players' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          <Leaderboard title="Goleadores" icon="ball" players={data.topScorers} metric={(p) => `${p.goals}`} />
          <Leaderboard title="Asistencias" icon="target" players={data.topAssists} metric={(p) => `${p.assists}`} />
          <Leaderboard
            title="Tarjetas"
            icon="info"
            players={data.topCards}
            metric={(p) => `${p.yellow}A ${p.red}R`}
          />
        </div>
      )}

      {seg === 'keepers' && (
        <div className="card">
          <div className="card-hd">
            <Icon name="shield" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Atajadas de porteros</h3>
          </div>
          <div className="card-pad">
            {data.goalkeepers.length ? (
              data.goalkeepers.map((g, i) => (
                <div
                  key={g.id}
                  className="row gap-10"
                  style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}
                >
                  <span className="num muted" style={{ width: 18 }}>
                    {i + 1}
                  </span>
                  <TeamCrest code={g.team} size={24} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{g.name}</span>
                  <span className="num">{g.cleanSheets} CS</span>
                  <span className="num tx-gold" style={{ fontWeight: 700 }}>
                    {g.saves}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                Sin datos de porteros todavía.
              </p>
            )}
          </div>
        </div>
      )}

      {seg === 'teams' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
          <div className="card">
            <div className="card-hd">
              <Icon name="ball" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Goles por selección</h3>
            </div>
            <div className="card-pad" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.teamGoals.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="team" width={42} tick={{ fontSize: 11, fill: 'var(--tx-2)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-3)' }}
                    contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }}
                  />
                  <Bar dataKey="goals" radius={[0, 6, 6, 0]}>
                    {data.teamGoals.slice(0, 10).map((d) => (
                      <Cell key={d.team} fill={teams[d.team]?.colorA ?? 'var(--gold)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <TeamLeader title="Posesión %" rows={data.teamPossession.map((r) => [r.team, r.possession])} />
          <TeamLeader title="Tiros" rows={data.teamShots.map((r) => [r.team, r.shots])} />
        </div>
      )}
    </div>
  );
}

function Leaderboard({
  title,
  icon,
  players,
  metric,
}: {
  title: string;
  icon: 'ball' | 'target' | 'info';
  players: Player[];
  metric: (p: Player) => string;
}) {
  return (
    <div className="card">
      <div className="card-hd">
        <Icon name={icon} size={15} style={{ color: 'var(--gold)' }} />
        <h3>{title}</h3>
      </div>
      <div className="card-pad" style={{ paddingTop: 6 }}>
        {players.length ? (
          players.map((p, i) => <PlayerMini key={p.id} p={p} rank={i + 1} metric={metric} />)
        ) : (
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Sin datos todavía (el torneo aún no empieza).
          </p>
        )}
      </div>
    </div>
  );
}

function TeamLeader({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="card">
      <div className="card-hd">
        <Icon name="stats" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{title}</h3>
      </div>
      <div className="card-pad">
        {rows.slice(0, 10).map(([team, val]) => (
          <div key={team} style={{ marginBottom: 10 }}>
            <div className="row gap-8" style={{ marginBottom: 4 }}>
              <TeamCrest code={team} size={18} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{team}</span>
              <span className="num" style={{ fontWeight: 700 }}>
                {val}
              </span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(val / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
