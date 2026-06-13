import { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge, Empty, cn } from '@worldcup/ui';
import { fmtFull, type Match, type MatchEvent, type Player, type Team } from '@worldcup/shared';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { TeamCrest, TeamFlag, TeamKit, FavStar, PlayerAvatar } from '@/components/identity';
import { useMatch, usePlayers, useTeamsMap } from '@/hooks';
import { useT, type Translate } from '@/i18n';
import { h2hSummary, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { recommendPick } from '@/lib/opsIntelligence';
import { usePool, type PoolPick } from '@/store/pool';

type Tab = 'events' | 'lineups' | 'stats' | 'intel';

export function MatchDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const t = useT();
  const { data, isLoading } = useMatch(id);
  const teams = useTeamsMap();
  const picks = usePool((s) => s.picks);
  const [tab, setTab] = useState<Tab>('events');

  if (isLoading) return <MatchDetailSkeleton />;
  const m = data?.item;
  if (!m) return <Empty icon="calendar" title={t('matchDetail.notFoundTitle')} text={t('matchDetail.notFoundText')} />;

  const homeName = teams[m.home]?.name ?? m.home;
  const awayName = teams[m.away]?.name ?? m.away;

  const events = data?.events ?? [];
  const weather = weatherSummary(m.id, t);
  const h2h = h2hSummary(m.home, m.away, t);
  const source = matchSourceInfo(m, t);
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
                {venueTimeLabel(m, t)}
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
              <Icon name="standings" size={13} /> {t('cards.group', { g: m.group })}
            </span>
          </div>

          <button
            type="button"
            className="btn gold"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={() => navigate({ to: '/analyst', search: { ctx: 'match', id: m.id } })}
          >
            <Icon name="ai" size={15} /> {t('matchDetail.askAnalyst')}
          </button>
        </div>
      </div>

      {m.status === 'UPCOMING' && (
        <section className="card card-pad" style={{ marginTop: 16 }}>
          <div className="row gap-8 align-center" style={{ marginBottom: 8 }}>
            <Icon name="ai" size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t('matchDetail.tacticalPreview')}</h3>
            <span className="badge">{t('matchDetail.autoGenerated')}</span>
          </div>
          <MatchPreviewBrief match={m} homeTeam={teams[m.home]} awayTeam={teams[m.away]} teamsArray={Object.values(teams)} />
        </section>
      )}

      {m.status === 'FT' && (
        <section className="card card-pad" style={{ marginTop: 16 }}>
          <div className="row gap-8 align-center" style={{ marginBottom: 8 }}>
            <Icon name="trophy" size={16} style={{ color: 'var(--gold)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t('matchDetail.postMatchDebrief')}</h3>
            <span className="badge">{t('matchDetail.autoAnalysis')}</span>
          </div>
          <PostMatchDebrief match={m} homeTeam={teams[m.home]} awayTeam={teams[m.away]} userPick={picks[m.id]} />
        </section>
      )}

      <div className="row gap-6 match-detail-tabs" style={{ marginBottom: 14 }}>
        {(['events', 'lineups', 'stats', 'intel'] as Tab[]).map((tb) => (
          <button key={tb} type="button" className={cn('pill', tab === tb && 'on')} onClick={() => setTab(tb)}>
            {tb === 'events' ? t('matchDetail.tabEvents') : tb === 'lineups' ? t('matchDetail.tabLineups') : tb === 'stats' ? t('matchDetail.tabStats') : t('matchDetail.tabSources')}
          </button>
        ))}
      </div>

      {tab === 'events' && <EventsTimeline match={m} events={events} homeCode={m.home} />}
      {tab === 'lineups' && <Lineups homeCode={m.home} awayCode={m.away} injuries={m.injuries} />}
      {tab === 'stats' && <MatchStats m={m} />}
      {tab === 'intel' && <MatchIntel source={source} weather={weather} h2h={h2h} />}
    </div>
  );
}

function MatchPreviewBrief({ match, homeTeam, awayTeam, teamsArray }: { match: Match; homeTeam: Team | undefined; awayTeam: Team | undefined; teamsArray: Team[] }) {
  const t = useT();
  const preview = useMemo(() => {
    if (!homeTeam || !awayTeam) return null;
    return recommendPick(match, teamsArray, t);
  }, [match, homeTeam, awayTeam, teamsArray, t]);

  if (!preview) return null;

  const confText = preview.confidence === 'Alta' ? t('opsIntel.confHigh') : preview.confidence === 'Media' ? t('opsIntel.confMed') : t('opsIntel.confLow');

  return (
    <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.6 }}>
      <p style={{ margin: '0 0 8px' }}>
        <strong>{homeTeam!.name}</strong> (#{homeTeam!.ranking}) vs <strong>{awayTeam!.name}</strong> (#{awayTeam!.ranking}).
        {' '}{preview.rationale}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--tx-3)' }}>
        <span>{t('matchDetail.confidence')}: <strong style={{ color: preview.confidence === 'Alta' ? 'var(--color-success)' : 'var(--gold)' }}>{confText}</strong></span>
        <span>{t('matchDetail.suggestedPick')}: <strong>{preview.pick.homeGoals}-{preview.pick.awayGoals}</strong></span>
        <span>{t('matchDetail.risk')}: {preview.risk}</span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--tx-3)', fontStyle: 'italic' }}>
        {t('matchDetail.previewDisclaimer')}
      </p>
    </div>
  );
}

function PostMatchDebrief({ match, homeTeam, awayTeam, userPick }: { match: Match; homeTeam: Team | undefined; awayTeam: Team | undefined; userPick: PoolPick | undefined }) {
  const t = useT();
  const { data: playersData } = usePlayers();
  const mvpPlayer = useMemo(() => playersData?.items.find((p) => p.id === match.mvp), [playersData, match.mvp]);

  const realHome = match.homeGoals ?? 0;
  const realAway = match.awayGoals ?? 0;
  const realOutcome = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

  let pointsText = '';
  let pointsColor = 'var(--tx-3)';
  if (userPick?.outcome) {
    const isExact = userPick.homeGoals === realHome && userPick.awayGoals === realAway;
    const isOutcome = userPick.outcome === realOutcome;
    if (isExact) { pointsText = t('matchDetail.pts3'); pointsColor = 'var(--gold)'; }
    else if (isOutcome) { pointsText = t('matchDetail.pts1'); pointsColor = 'var(--color-success)'; }
    else { pointsText = t('matchDetail.pts0'); pointsColor = 'var(--color-danger)'; }
  }

  const observation = realHome + realAway === 0
    ? t('matchDetail.obsDefensive')
    : realHome + realAway >= 4
    ? t('matchDetail.obsHighScore')
    : realHome === realAway
    ? t('matchDetail.obsDraw')
    : t('matchDetail.obsClearWin', { name: realHome > realAway ? (homeTeam?.name ?? t('matchDetail.fallbackHome')) : (awayTeam?.name ?? t('matchDetail.fallbackAway')) });

  return (
    <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.6 }}>
      {match.chronicle && (
        <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 8, marginBottom: 12, borderLeft: '3px solid var(--gold)' }}>
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: 12 }}>"{match.chronicle}"</p>
        </div>
      )}
      {mvpPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '8px', background: 'var(--bg-hover)', borderRadius: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)' }}>
             <PlayerAvatar player={mvpPlayer} size={40} />
          </div>
          <div>
            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>{t('matchDetail.mvp') || 'JUGADOR DEL PARTIDO'}</span>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{mvpPlayer.name}</div>
          </div>
        </div>
      )}
      <p style={{ margin: '0 0 6px' }}>
        {t('matchDetail.finalResult')}: <strong>{homeTeam?.name ?? match.home} {realHome} - {realAway} {awayTeam?.name ?? match.away}</strong>
      </p>
      <p style={{ margin: '0 0 6px' }}>{observation}</p>
      {userPick?.outcome && (
        <p style={{ margin: '0 0 4px' }}>
          {t('matchDetail.yourPrediction')}: <strong>{userPick.homeGoals ?? '?'}-{userPick.awayGoals ?? '?'}</strong> → <span style={{ color: pointsColor, fontWeight: 700 }}>{pointsText}</span>
        </p>
      )}
      {!userPick?.outcome && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--tx-3)', fontStyle: 'italic' }}>{t('matchDetail.noPrediction')}</p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--tx-3)', opacity: 0.7, fontStyle: 'italic' }}>
        {t('matchDetail.obsDisclaimer')}
      </p>
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
  const t = useT();
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
      <IntelCard title={t('matchDetail.intelSchedule')} data={source} />
      <IntelCard title={t('matchdayHero.labelWeather')} data={{ label: weather.label, source: weather.source, date: weather.date, confidence: weather.confidence }} />
      <IntelCard title={t('matchDetail.intelH2h')} data={h2h} />
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

function EventsTimeline({ match, events, homeCode }: { match: Match; events: MatchEvent[]; homeCode: string }) {
  const t = useT();
  const { data: playersData } = usePlayers();
  const aiTimeline = match.timeline ?? [];
  if (!events.length && !aiTimeline.length) return <Empty icon="whistle" title={t('matchDetail.noEventsTitle')} text={t('matchDetail.noEventsText')} />;
  
  if (aiTimeline.length) {
    const iconMap: Record<string, string> = { goal: 'ball', yellow_card: 'cards', red_card: 'cards', substitution: 'activity', injury: 'activity', other: 'info' };
    const colorMap: Record<string, string> = { goal: 'var(--gold)', yellow_card: '#FFC107', red_card: '#F44336', substitution: 'var(--tx-2)', injury: '#F44336', other: 'var(--tx-3)' };
    
    return (
      <div className="card card-pad">
        <div className="tl">
          <div className="axis" />
          {[...aiTimeline].sort((a, b) => a.minute - b.minute).map((e, idx) => {
            const isHome = e.team === 'home';
            const player = playersData?.items.find(p => p.id === e.player);
            const playerName = player ? shortPlayerName(player.name) : e.player;
            return (
              <div key={idx} className="tl-ev">
                <div>
                  {isHome && (
                    <span className="tl-card right">
                      <Icon name={iconMap[e.type] as any} size={13} style={{ color: colorMap[e.type] }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <strong style={{ fontSize: 13 }}>{playerName}</strong>
                        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>{e.detail}</span>
                      </div>
                    </span>
                  )}
                </div>
                <span className="tl-min num">{e.minute}&apos;</span>
                <div>
                  {!isHome && (
                    <span className="tl-card">
                      <Icon name={iconMap[e.type] as any} size={13} style={{ color: colorMap[e.type] }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: 13 }}>{playerName}</strong>
                        <span style={{ fontSize: 11, color: 'var(--tx-3)' }}>{e.detail}</span>
                      </div>
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
                      <span style={{ fontSize: 12.5 }}>{e.description || t('matchDetail.goalEvent')}</span>
                    </span>
                  )}
                </div>
                <span className="tl-min num">{e.minute}&apos;</span>
                <div>
                  {!isHome && (
                    <span className="tl-card">
                      <Icon name="ball" size={13} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontSize: 12.5 }}>{e.description || t('matchDetail.goalEvent')}</span>
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

function Lineups({ homeCode, awayCode, injuries }: { homeCode: string; awayCode: string; injuries?: string[] }) {
  const { data: home } = usePlayers({ team: homeCode });
  const { data: away } = usePlayers({ team: awayCode });
  const homePlayers = home?.items ?? [];
  const awayPlayers = away?.items ?? [];

  return (
    <div className="match-lineups-layout">
      <LineupPitch homeCode={homeCode} awayCode={awayCode} homePlayers={homePlayers} awayPlayers={awayPlayers} />
      <div className="grid squad-list-grid">
        <SquadList code={homeCode} players={homePlayers} injuries={injuries} />
        <SquadList code={awayCode} players={awayPlayers} injuries={injuries} />
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
  const t = useT();
  const homeTeam = teams[homeCode];
  const awayTeam = teams[awayCode];
  const homeXI = selectLineup(homePlayers);
  const awayXI = selectLineup(awayPlayers);

  return (
    <section className="card lineup-pitch-card">
      <div className="lineup-pitch-head">
        <TeamBrief code={homeCode} label={homeTeam?.name ?? homeCode} formation={formationLabel(homeXI, t)} />
        <span className="mono-label">{t('matchDetail.estFormation')}</span>
        <TeamBrief code={awayCode} label={awayTeam?.name ?? awayCode} formation={formationLabel(awayXI, t)} align="right" />
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
        <div className="lineup-center-label mono-label">{t('matchDetail.midfield')}</div>
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

function formationLabel(players: Player[], t: Translate): string {
  const df = players.filter((p) => p.pos === 'DF').length;
  const mf = players.filter((p) => p.pos === 'MF').length;
  const fw = players.filter((p) => p.pos === 'FW').length;
  return df && mf && fw ? `${df}-${mf}-${fw}` : t('data.pending');
}

function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : name;
}

function SquadList({ code, players, injuries }: { code: string; players: Player[]; injuries?: string[] }) {
  const teams = useTeamsMap();
  const t = useT();
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
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>
                {p.name} {injuries?.includes(p.id) && <span title="Lesionado">🚑</span>}
              </span>
              <span className={`pos-tag pos-${p.pos}`}>{p.pos}</span>
            </div>
          ))
        ) : (
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            {t('matchDetail.squadUnavailable')}
          </p>
        )}
      </div>
    </div>
  );
}

function MatchStats({ m }: { m: Match }) {
  const t = useT();
  
  if (!m.teamStats && m.shotsH == null)
    return <Empty icon="stats" title={t('stats.emptyTitle')} text={t('matchDetail.noStatsText')} />;
    
  const rows: Array<[string, number, number]> = m.teamStats ? [
    [t('stats.possession'), m.teamStats.home.possession, m.teamStats.away.possession],
    [t('cards.shots'), m.teamStats.home.shots, m.teamStats.away.shots],
    ['Tiros de Esquina', m.teamStats.home.corners, m.teamStats.away.corners],
    ['Faltas', m.teamStats.home.fouls, m.teamStats.away.fouls]
  ] : [
    [t('stats.possession'), m.possH ?? 50, 100 - (m.possH ?? 50)],
    [t('cards.shots'), m.shotsH ?? 0, m.shotsA ?? 0],
    [t('matchDetail.shotsOnTarget'), m.shotsTH ?? 0, m.shotsTA ?? 0],
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
