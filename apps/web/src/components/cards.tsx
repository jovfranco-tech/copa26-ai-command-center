/** Data-bound cards + rows, ported from the approved prototype. */
import type { CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge, Form, cn } from '@worldcup/ui';
import { fmtDay, fmtGD, nextMatchFor, type Match, type Player, type StandingRow } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit, FavStar, PlayerAvatar } from './identity';
import { DataSourceBadge } from './DataSourceBadge';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import { useT, useLang } from '@/i18n';
import { playerRatingMeta } from '@/generated/playerRatings';
import { h2hSummary, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { attrColor, attrLabelsFor, playerRatings } from '@/lib/ratings';

export function MatchCard({ m }: { m: Match }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const t = useT();
  const live = m.status === 'LIVE';
  const played = m.status !== 'UPCOMING';
  const pH = m.possH != null ? Math.min(72, Math.max(28, m.possH)) : 50;
  const city = venues[m.venue]?.city ?? '';
  const source = matchSourceInfo(m);
  const weather = weatherSummary(m.id);
  const h2h = h2hSummary(m.home, m.away);
  const venuePhoto = venuePhotoSrc(m.venue);

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
      <div
        className="match-card-visual"
        style={venuePhoto ? { backgroundImage: `linear-gradient(90deg, rgba(8,12,22,.72), rgba(8,12,22,.38)), url(${venuePhoto})` } : undefined}
      >
        <div className="match-card-flags">
          <TeamFlag code={m.home} size={16} />
          <span>{teams[m.home]?.name ?? m.home}</span>
          <span className="mono-label">vs</span>
          <TeamFlag code={m.away} size={16} />
          <span>{teams[m.away]?.name ?? m.away}</span>
        </div>
        <div className="match-card-kits">
          <TeamKit code={m.home} size={32} variant="home" />
          <span className="mono-label">{m.group ? t('cards.group', { g: m.group }) : m.stage}</span>
          <TeamKit code={m.away} size={32} variant="away" />
        </div>
      </div>
      <div className="match-row">
        <span className="match-team">
          <TeamCrest code={m.home} size={30} />
          <TeamKit code={m.home} size={24} />
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
          <TeamKit code={m.away} size={24} />
          <span className="tname">{teams[m.away]?.name ?? m.away}</span>
        </span>
      </div>

      <div className="match-intel-row">
        <span title={weather.detail}>
          <Icon name="rain" size={12} /> {weather.label}
        </span>
        <span title={venueTimeLabel(m)}>
          <Icon name="clock" size={12} /> {venueTimeLabel(m)}
        </span>
        <span title={`${h2h.source} · ${h2h.date}`}>
          <Icon name="activity" size={12} /> {h2h.label}
        </span>
      </div>

      {played && m.shotsH != null && (
        <div className="mc-stats">
          <div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 10.5 }}>
              <span className="mono-label" style={{ margin: 0 }}>
                {t('cards.possession')}
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
              {t('cards.shots')}
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
        <span className="row gap-6 wrap">
          <span className="mono-label" style={{ margin: 0 }}>
            {live ? t('cards.liveMin', { min: m.minute ?? 0 }) : played ? t('cards.final') : `${fmtDay(m.date)} · ${m.time}`}
          </span>
          <DataSourceBadge {...source} compact />
        </span>
        <span className="mc-cta">
          {t('common.viewMatch')} <Icon name="chevR" size={12} />
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
  const t = useT();
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
                {t('cards.grp', { g: m.group })}
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
  const t = useT();
  const { data: matchesData } = useMatches();
  const team = teams[code];
  const matches = matchesData?.items ?? [];
  const next = nextMatchFor(matches, code);
  const oppCode = next ? (next.home === code ? next.away : next.home) : null;
  if (!team) return null;

  return (
    <div
      className="card hoverable team-card"
      onClick={() => navigate({ to: '/teams/$code', params: { code } })}
    >
      <div className="team-card-strip" style={{ background: `linear-gradient(90deg, ${team.colorA}, ${team.colorB})` }} />
      <div className="card-pad">
        <div className="row gap-12 team-card-main">
          <TeamCrest code={code} size={46} />
          <TeamKit code={code} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-8">
              <TeamFlag code={code} size={14} />
              <span style={{ fontWeight: 700, fontSize: 15 }} className="nowrap">
                {team.name}
              </span>
            </div>
            <div className="mono-label">{t('cards.group', { g: team.group })}</div>
            <div style={{ marginTop: 6 }}>
              <DataSourceBadge
                label={team.ranking ? t('cards.rankingLoaded') : t('cards.rankingPending')}
                source={team.ranking ? t('cards.localDataset') : t('cards.fifaFeedPending')}
                date={team.ranking ? '2026-05-31' : t('cards.toUpdate')}
                confidence={team.ranking ? 'Media' : 'Pendiente'}
                compact
              />
            </div>
          </div>
          <FavStar kind="teams" id={code} />
        </div>
        {standing && (
          <div className="row team-card-stats">
            <Stat label={t('table.pts')} value={standing.Pts} />
            <Stat label={t('table.wdl')} value={`${standing.W}-${standing.D}-${standing.L}`} />
            <Stat label={t('table.gf')} value={standing.GF} />
            <Stat
              label={t('table.gd')}
              value={fmtGD(standing.GD)}
              className={standing.GD > 0 ? 'gd-pos' : standing.GD < 0 ? 'gd-neg' : ''}
            />
            <div>
              <div className="mono-label">{t('table.form')}</div>
              <div style={{ marginTop: 3 }}>
                <Form list={standing.form} />
              </div>
            </div>
          </div>
        )}
        {next && oppCode && (
          <div className="tc-next" style={{ marginTop: 13 }}>
            <span className="mono-label" style={{ margin: 0 }}>
              {t('cards.next')}
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
    <div className="mini-stat">
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
  const t = useT();
  const lang = useLang();
  const team = teams[p.team];
  const r = playerRatings(p);
  const labels = attrLabelsFor(p);
  const primary = team?.colorA ?? '#c9a24b';
  const secondary = team?.colorB ?? '#e0bd6c';
  const cardStyle = {
    '--player-primary': primary,
    '--player-secondary': secondary,
  } as CSSProperties;

  return (
    <div
      className="card hoverable player-card"
      onClick={() => navigate({ to: '/players/$playerId', params: { playerId: p.id } })}
      style={cardStyle}
    >
      <div className="player-card-kitbar" aria-hidden="true" />
      <div className="player-card-top">
        {rank != null && (
          <span className="num muted player-card-rank">
            {rank}
          </span>
        )}
        <span className="player-card-avatar">
          <PlayerAvatar player={p} size={62} />
          <span className="num player-overall-badge">
            {r.overall}
          </span>
        </span>
        <div className="player-card-copy">
          <div className="player-card-name-row">
            <span className="player-card-name">
              {p.name}
            </span>
            <span className="num muted" style={{ fontSize: 11 }}>
              #{p.number ?? '—'}
            </span>
          </div>
          <div className="player-card-meta">
            <TeamFlag code={p.team} size={13} />
            <span className="nowrap">{team?.name ?? p.team}</span>
            <span className={`pos-tag pos-${p.pos}`}>{p.pos}</span>
            <span className="nowrap">{p.club}</span>
          </div>
          <div className="player-card-badges">
            <span
              className={`rating-source ${r.source}`}
              title={
                r.source === 'fc26'
                  ? r.providerName
                    ? t('attrs.fc26Provider', { provider: r.providerName })
                    : t('attrs.fc26')
                  : t('attrs.estimateText')
              }
            >
              {r.source === 'fc26' ? 'FC 26' : t('cards.estimated')}
            </span>
            <DataSourceBadge
              label={r.source === 'fc26' ? t('cards.ratingFc26') : t('cards.ratingEstimated')}
              source={r.source === 'fc26' ? 'EA SPORTS FC 26' : t('attrs.estimateSource')}
              date={r.source === 'fc26' ? playerRatingMeta.downloadedAt.slice(0, 10) : '2026-05-30'}
              confidence={r.source === 'fc26' ? 'Alta' : 'Media'}
              compact
            />
          </div>
        </div>
        <FavStar kind="players" id={p.id} />
      </div>
      <div
        className="row player-attrs"
      >
        {labels.map((a) => (
          <div key={a.key} style={{ textAlign: 'center' }}>
            <div className="num" style={{ fontWeight: 700, fontSize: 15, color: attrColor(r[a.key]) }}>
              {r[a.key]}
            </div>
            <div className="mono-label" style={{ margin: 0 }}>
              {lang === 'es' ? a.short : a.shortEn}
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
  const t = useT();
  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th>{t('table.team')}</th>
            <th className="center">{t('table.played')}</th>
            <th className="center">{t('table.won')}</th>
            <th className="center">{t('table.drawn')}</th>
            <th className="center">{t('table.lost')}</th>
            <th className="center">{t('table.gf')}</th>
            <th className="center">{t('table.ga')}</th>
            <th className="center">{t('table.gd')}</th>
            <th className="center">{t('table.pts')}</th>
            <th>{t('table.form')}</th>
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
