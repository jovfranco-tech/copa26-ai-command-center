/** Data-bound cards + rows, ported from the approved prototype. */
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge, Form, cn } from '@worldcup/ui';
import { fmtDay, fmtGD, nextMatchFor, type Match, type Player, type StandingRow } from '@worldcup/shared';
import { TeamCrest, TeamFlag, FavStar, PlayerAvatar } from './identity';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';

export function MatchCard({ m }: { m: Match }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const live = m.status === 'LIVE';
  const played = m.status !== 'UPCOMING';
  const pH = m.possH != null ? Math.min(72, Math.max(28, m.possH)) : 50;
  const city = venues[m.venue]?.city ?? '';

  return (
    <div
      className="card hoverable match-card"
      onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: m.id } })}
      style={live ? { borderColor: 'color-mix(in srgb, var(--live) 45%, transparent)' } : undefined}
    >
      <div className="match-meta">
        <StatusBadge status={m.status} minute={m.minute} time={m.time} />
        <span className="mono-label" style={{ margin: 0 }}>
          {m.stage} · MD{m.matchday}
        </span>
        <span className="right row gap-6 nowrap muted">
          <Icon name="pin" size={12} />
          {city}
        </span>
      </div>
      <div className="match-row">
        <span className="match-team">
          <TeamCrest code={m.home} size={30} />
          <span className="tname">{teams[m.home]?.name ?? m.home}</span>
        </span>
        {m.status === 'UPCOMING' ? (
          <span className="match-kick">
            {m.time}
            <br />
            <span className="mono-label">{fmtDay(m.date)}</span>
          </span>
        ) : (
          <span className="match-score">
            <span>{m.homeGoals}</span>
            <span className="sep">–</span>
            <span>{m.awayGoals}</span>
          </span>
        )}
        <span className="match-team away">
          <TeamCrest code={m.away} size={30} />
          <span className="tname">{teams[m.away]?.name ?? m.away}</span>
        </span>
      </div>

      {played && m.shotsH != null && (
        <div className="mc-stats">
          <div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 10.5 }}>
              <span className="mono-label" style={{ margin: 0 }}>
                Poss
              </span>
              <span className="num">{pH}%</span>
            </div>
            <div className="poss" style={{ marginTop: 4 }}>
              <i style={{ width: `${pH}%`, background: 'var(--gold)' }} />
              <i style={{ width: `${100 - pH}%`, background: 'var(--bg-hover)' }} />
            </div>
          </div>
          <span className="mono-label" style={{ margin: 0 }}>
            ·
          </span>
          <div style={{ textAlign: 'right' }}>
            <div className="mono-label" style={{ margin: 0 }}>
              Shots
            </div>
            <div className="num" style={{ fontWeight: 700, fontSize: 13 }}>
              {m.shotsH}
              <span className="muted"> – </span>
              {m.shotsA}
            </div>
          </div>
        </div>
      )}

      <div className="mc-foot">
        <span className="mono-label" style={{ margin: 0 }}>
          {live ? `LIVE · ${m.minute}'` : played ? 'Full time' : `${fmtDay(m.date)} · ${m.time}`}
        </span>
        <span className="mc-cta">
          Match detail <Icon name="chevR" size={12} />
        </span>
      </div>
    </div>
  );
}

export function MatchRow({ m }: { m: Match }) {
  const navigate = useNavigate();
  return (
    <div
      className="row gap-12 clickable"
      style={{ padding: '10px 4px', borderBottom: '1px solid var(--line)' }}
      onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: m.id } })}
    >
      <span style={{ width: 58 }}>
        <StatusBadge status={m.status} minute={m.minute} time={m.time} />
      </span>
      <span className="row gap-8" style={{ flex: 1, minWidth: 0 }}>
        <TeamCrest code={m.home} size={22} />
        <span className="nowrap" style={{ fontWeight: 600, fontSize: 13 }}>
          {m.home}
        </span>
      </span>
      <span className="num" style={{ fontWeight: 700, minWidth: 44, textAlign: 'center' }}>
        {m.status === 'UPCOMING' ? (
          <span className="muted" style={{ fontSize: 12 }}>
            {m.time}
          </span>
        ) : (
          `${m.homeGoals}–${m.awayGoals}`
        )}
      </span>
      <span className="row gap-8" style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
        <span className="nowrap" style={{ fontWeight: 600, fontSize: 13 }}>
          {m.away}
        </span>
        <TeamCrest code={m.away} size={22} />
      </span>
    </div>
  );
}

export function Ticker({ items }: { items: Match[] }) {
  const navigate = useNavigate();
  return (
    <div className="ticker">
      {items.map((m) => {
        const live = m.status === 'LIVE';
        return (
          <div
            key={m.id}
            className={cn('tick', live && 'is-live')}
            onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: m.id } })}
          >
            <div className="tick-top">
              {live ? (
                <span className="badge live">
                  <span className="live-dot" />
                  {m.minute}&apos;
                </span>
              ) : (
                <span className="mono-label" style={{ margin: 0 }}>
                  {m.status === 'FT' ? 'FT' : m.time}
                </span>
              )}
              <span className="mono-label" style={{ margin: 0 }}>
                Grp {m.group}
              </span>
            </div>
            <div className="tick-team">
              <TeamCrest code={m.home} size={18} />
              <span>{m.home}</span>
              <span className="num">{m.homeGoals ?? '–'}</span>
            </div>
            <div className="tick-team" style={{ marginTop: 5 }}>
              <TeamCrest code={m.away} size={18} />
              <span>{m.away}</span>
              <span className="num">{m.awayGoals ?? '–'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TeamCard({ code, standing }: { code: string; standing?: StandingRow }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const { data: matchesData } = useMatches();
  const t = teams[code];
  const matches = matchesData?.items ?? [];
  const next = nextMatchFor(matches, code);
  const oppCode = next ? (next.home === code ? next.away : next.home) : null;
  if (!t) return null;

  return (
    <div
      className="card hoverable"
      style={{ overflow: 'hidden' }}
      onClick={() => navigate({ to: '/teams/$code', params: { code } })}
    >
      <div style={{ height: 5, background: `linear-gradient(90deg, ${t.colorA}, ${t.colorB})` }} />
      <div className="card-pad">
        <div className="row gap-12">
          <TeamCrest code={code} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-8">
              <TeamFlag code={code} size={14} />
              <span style={{ fontWeight: 700, fontSize: 15 }} className="nowrap">
                {t.name}
              </span>
            </div>
            <div className="mono-label">
              Group {t.group} · FIFA #{t.ranking ?? '—'}
            </div>
          </div>
          <FavStar kind="teams" id={code} />
        </div>
        {standing && (
          <div className="row" style={{ marginTop: 13, justifyContent: 'space-between' }}>
            <Stat label="Pts" value={standing.Pts} />
            <Stat label="W-D-L" value={`${standing.W}-${standing.D}-${standing.L}`} />
            <Stat label="GF" value={standing.GF} />
            <Stat
              label="GD"
              value={fmtGD(standing.GD)}
              className={standing.GD > 0 ? 'gd-pos' : standing.GD < 0 ? 'gd-neg' : ''}
            />
            <div>
              <div className="mono-label">Form</div>
              <div style={{ marginTop: 3 }}>
                <Form list={standing.form} />
              </div>
            </div>
          </div>
        )}
        {next && oppCode && (
          <div className="tc-next" style={{ marginTop: 13 }}>
            <span className="mono-label" style={{ margin: 0 }}>
              Next
            </span>
            <TeamCrest code={oppCode} size={20} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{teams[oppCode]?.name ?? oppCode}</span>
            <span className="right mono-label" style={{ margin: 0 }}>
              {fmtDay(next.date)} · {next.time}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div className={cn('num', className)} style={{ fontWeight: 700, fontSize: 17 }}>
        {value}
      </div>
    </div>
  );
}

export function PlayerCard({ p, rank }: { p: Player; rank?: number }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const t = teams[p.team];
  return (
    <div
      className="card hoverable"
      style={{ padding: '13px 15px' }}
      onClick={() => navigate({ to: '/players/$playerId', params: { playerId: p.id } })}
    >
      <div className="row gap-12">
        {rank != null && (
          <span className="num muted" style={{ width: 20, fontWeight: 700 }}>
            {rank}
          </span>
        )}
        <PlayerAvatar player={p} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row gap-8">
            <span style={{ fontWeight: 700, fontSize: 14 }} className="nowrap">
              {p.name}
            </span>
            <span className="num muted" style={{ fontSize: 11 }}>
              #{p.number ?? '—'}
            </span>
          </div>
          <div className="row gap-6 muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            <TeamFlag code={p.team} size={13} />
            <span className="nowrap">{t?.name ?? p.team}</span>
            <span>·</span>
            <span className={`pos-tag pos-${p.pos}`}>{p.pos}</span>
            <span className="nowrap">{p.club}</span>
          </div>
        </div>
        <FavStar kind="players" id={p.id} />
      </div>
      <div
        className="row"
        style={{ marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--line)', justifyContent: 'space-between' }}
      >
        {(
          [
            ['G', p.goals],
            ['A', p.assists],
            ['Min', p.minutes],
            ['YC', p.yellow],
            ['Age', p.age ?? '—'],
          ] as Array<[string, string | number]>
        ).map(([k, val]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div
              className="num"
              style={{ fontWeight: 700, fontSize: 15, color: k === 'G' ? 'var(--gold-2)' : 'var(--tx)' }}
            >
              {val}
            </div>
            <div className="mono-label" style={{ margin: 0 }}>
              {k}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerMini({
  p,
  rank,
  metric,
}: {
  p: Player;
  rank?: number;
  metric?: (p: Player) => string | number;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="row gap-10 clickable"
      style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}
      onClick={() => navigate({ to: '/players/$playerId', params: { playerId: p.id } })}
    >
      {rank != null && (
        <span className="num muted" style={{ width: 16, fontWeight: 700 }}>
          {rank}
        </span>
      )}
      <PlayerAvatar player={p} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">
          {p.name}
        </div>
        <div className="mono-label" style={{ margin: 0 }}>
          {p.team} · {p.pos}
        </div>
      </div>
      <span className="num tx-gold" style={{ fontWeight: 700, fontSize: 15 }}>
        {metric ? metric(p) : p.goals}
      </span>
    </div>
  );
}

export function StandingsTable({ rows, highlight }: { rows: StandingRow[]; highlight?: string }) {
  const navigate = useNavigate();
  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th>Team</th>
            <th className="center">P</th>
            <th className="center">W</th>
            <th className="center">D</th>
            <th className="center">L</th>
            <th className="center">GF</th>
            <th className="center">GA</th>
            <th className="center">GD</th>
            <th className="center">Pts</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.team}
              className={cn('clickable', i < 2 && 'r-adv')}
              onClick={() => navigate({ to: '/teams/$code', params: { code: r.team } })}
            >
              <td>
                <span className="row gap-6">
                  <span className={cn('qualify-bar', i < 2 ? 'q1' : i === 2 ? 'q3' : 'q4')} />
                  <span className="rank">{i + 1}</span>
                </span>
              </td>
              <td>
                <span className="row gap-8">
                  <TeamCrest code={r.team} size={20} />
                  <span
                    className="strong nowrap"
                    style={{ fontSize: 12.5, fontWeight: r.team === highlight ? 800 : 600 }}
                  >
                    {r.team}
                  </span>
                </span>
              </td>
              <td className="center num">{r.P}</td>
              <td className="center num">{r.W}</td>
              <td className="center num">{r.D}</td>
              <td className="center num">{r.L}</td>
              <td className="center num">{r.GF}</td>
              <td className="center num">{r.GA}</td>
              <td className={cn('center num', r.GD > 0 ? 'gd-pos' : r.GD < 0 ? 'gd-neg' : '')}>
                {fmtGD(r.GD)}
              </td>
              <td className="center num strong tx-gold">{r.Pts}</td>
              <td>
                <Form list={r.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
