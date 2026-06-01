import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { Icon, Pill, Empty } from '@worldcup/ui';
import type { Player } from '@worldcup/shared';
import { PlayerMini } from '@/components/cards';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useStats, useTeamsMap, useMatches } from '@/hooks';
import { usePool } from '@/store/pool';
import { db } from '@/lib/firebase';
import { normalizePoolGroupId } from '@/lib/api';
import { collection, onSnapshot } from 'firebase/firestore';

type Segment = 'players' | 'keepers' | 'teams' | 'arena';

export function Stats() {
  const { data, isLoading } = useStats();
  const teams = useTeamsMap();
  const matchData = useMatches();
  const pool = usePool();
  const [seg, setSeg] = useState<Segment>('players');

  const [leaderboard, setLeaderboard] = useState<Array<{ name: string; points: number }>>([]);

  useEffect(() => {
    const matchItems = matchData?.data?.items ?? [];
    if (!matchItems.length) return;

    const playedMatches = matchItems.filter((m) => m.status === 'FT');
    const teamItems = Object.values(teams);
    const teamMap = new Map(teamItems.map((t) => [t.code, t]));

    const unsubscribe = onSnapshot(
      collection(db, 'poolGroups', normalizePoolGroupId(pool.groupId), 'members'),
      (snapshot) => {
        const board: Array<{ name: string; points: number }> = [];

        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const name = typeof docData.playerName === 'string' ? docData.playerName : docSnap.id;
          const picks = docData.picks || {};

          let points = 0;
          for (const m of playedMatches) {
            const pick = picks[m.id];
            if (!pick || !pick.outcome) continue;

            const realHome = m.homeGoals ?? 0;
            const realAway = m.awayGoals ?? 0;

            let realOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (realHome > realAway) realOutcome = 'home';
            else if (realHome < realAway) realOutcome = 'away';

            const isExact = pick.homeGoals === realHome && pick.awayGoals === realAway;
            const isOutcomeCorrect = pick.outcome === realOutcome;

            if (isExact) points += 3;
            else if (isOutcomeCorrect) points += 1;
          }

          board.push({ name, points });
        });

        // Inject the 3 AI Agents
        const agents: Array<'optimista' | 'stats' | 'contrarian'> = ['optimista', 'stats', 'contrarian'];
        const agentNames = {
          optimista: '🤖 El Analista Optimista',
          stats: '🤖 El Simulador Estadístico',
          contrarian: '🤖 El Agente Contrarian',
        };

        for (const agent of agents) {
          let points = 0;
          for (const m of playedMatches) {
            const homeTeam = teamMap.get(m.home);
            const awayTeam = teamMap.get(m.away);

            const homeRank = homeTeam?.ranking ?? 50;
            const awayRank = awayTeam?.ranking ?? 50;
            const rankDiff = awayRank - homeRank;

            let pred: { homeGoals: number; awayGoals: number; outcome: 'home' | 'draw' | 'away' };
            if (agent === 'optimista') {
              if (rankDiff > 10) pred = { homeGoals: 3, awayGoals: 1, outcome: 'home' };
              else if (rankDiff < -10) pred = { homeGoals: 1, awayGoals: 3, outcome: 'away' };
              else pred = { homeGoals: 2, awayGoals: 2, outcome: 'draw' };
            } else if (agent === 'stats') {
              if (rankDiff > 5) pred = { homeGoals: 1, awayGoals: 0, outcome: 'home' };
              else if (rankDiff < -5) pred = { homeGoals: 0, awayGoals: 1, outcome: 'away' };
              else pred = { homeGoals: 1, awayGoals: 1, outcome: 'draw' };
            } else {
              if (rankDiff > 15) pred = { homeGoals: 1, awayGoals: 2, outcome: 'away' };
              else if (rankDiff < -15) pred = { homeGoals: 2, awayGoals: 1, outcome: 'home' };
              else pred = { homeGoals: 0, awayGoals: 0, outcome: 'draw' };
            }

            const realHome = m.homeGoals ?? 0;
            const realAway = m.awayGoals ?? 0;

            let realOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (realHome > realAway) realOutcome = 'home';
            else if (realHome < realAway) realOutcome = 'away';

            const isExact = pred.homeGoals === realHome && pred.awayGoals === realAway;
            const isOutcomeCorrect = pred.outcome === realOutcome;

            if (isExact) points += 3;
            else if (isOutcomeCorrect) points += 1;
          }

          board.push({ name: agentNames[agent], points });
        }

        board.sort((a, b) => b.points - a.points);
        setLeaderboard(board);
      },
      (error) => {
        console.error('Firestore onSnapshot in Stats error:', error);
      }
    );

    return () => unsubscribe();
  }, [matchData, teams, pool.groupId]);

  const radarData = [
    { subject: 'Ataque Ofensivo', optimista: 95, stats: 45, contrarian: 80, fullMark: 100 },
    { subject: 'Eficacia Goleo', optimista: 90, stats: 50, contrarian: 75, fullMark: 100 },
    { subject: 'Posesión Balón', optimista: 85, stats: 75, contrarian: 45, fullMark: 100 },
    { subject: 'Afinidad Sorpresa', optimista: 40, stats: 20, contrarian: 95, fullMark: 100 },
    { subject: 'Consistencia', optimista: 65, stats: 95, contrarian: 30, fullMark: 100 },
  ];

  if (isLoading) return <p className="muted">Cargando estadísticas…</p>;
  if (!data) return <Empty icon="stats" title="Sin estadísticas" text="Las estadísticas aparecen cuando se juegan los partidos." />;

  return (
    <div className="page-fade">
      <MockBanner />
      <div className="source-strip">
        <DataSourceBadge
          label="Estadisticas de torneo"
          source={data.source === 'sqlite' ? 'SQLite local' : 'Dataset local'}
          date="2026-05-31"
          confidence={data.topScorers.length || data.teamGoals.length ? 'Alta' : 'Pendiente'}
        />
      </div>

      <div className="row gap-6 wrap" style={{ marginBottom: 16 }}>
        {(['players', 'keepers', 'teams', 'arena'] as Segment[]).map((s) => (
          <Pill key={s} on={seg === s} onClick={() => setSeg(s)}>
            {s === 'players' ? 'Jugadores' : s === 'keepers' ? 'Porteros' : s === 'teams' ? 'Selecciones' : 'Arena de Co-pilotos'}
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
              <Empty icon="shield" title="Porteros en espera" text="Las atajadas y vallas invictas aparecerán cuando haya partidos jugados." />
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

      {seg === 'arena' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          <div className="card animate-fade-in">
            <div className="card-hd">
              <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Huella Táctica de Co-pilotos (Radar)</h3>
            </div>
            <div className="card-pad" style={{ height: 320, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--line)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--tx-2)', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--tx-3)', fontSize: 8 }} />
                  <Radar name="Optimista" dataKey="optimista" stroke="#c9a24b" fill="#c9a24b" fillOpacity={0.15} />
                  <Radar name="Estadístico" dataKey="stats" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                  <Radar name="Contrarian" dataKey="contrarian" stroke="#e11d48" fill="#e11d48" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card animate-fade-in">
            <div className="card-hd">
              <Icon name="trophy" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Rendimiento Real Quiniela (Firestore)</h3>
            </div>
            <div className="card-pad" style={{ height: 320 }}>
              {leaderboard.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaderboard.slice(0, 5)} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'var(--tx-2)' }} />
                    <Tooltip
                      cursor={{ fill: 'var(--bg-3)' }}
                      contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)' }}
                    />
                    <Bar dataKey="points" name="Puntos" radius={[0, 6, 6, 0]}>
                      {leaderboard.slice(0, 5).map((d) => {
                        const isAi = d.name.startsWith('🤖');
                        const isUser = d.name.trim().toLowerCase() === pool.playerName.trim().toLowerCase();
                        const color = isUser ? 'var(--gold)' : isAi ? 'var(--tx-3)' : '#4f46e5';
                        return <Cell key={d.name} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
                    Cargando clasificación en tiempo real desde Firestore…
                  </p>
                </div>
              )}
            </div>
          </div>
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
          <Empty icon={icon} title={`${title} en espera`} text="El torneo aún no empieza; esta tabla se llenará con estadísticas reales." />
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
        {rows.length ? (
          rows.slice(0, 10).map(([team, val]) => (
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
          ))
        ) : (
          <Empty icon="stats" title={`${title} en espera`} text="Se llenará automáticamente cuando haya partidos con estadísticas." />
        )}
      </div>
    </div>
  );
}
