import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Section, StatTile, Skeleton } from '@worldcup/ui';
import { avg, fmtGD, type Match } from '@worldcup/shared';
import { MatchCard, MatchRow, Ticker, PlayerMini } from '@/components/cards';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, useStandings, useStats, useSyncStatus } from '@/hooks';
import { useFavorites } from '@/store/favorites';

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
  const favTeams = useFavorites((s) => s.teams);
  const favPlayers = useFavorites((s) => s.players);
  const favMatches = useFavorites((s) => s.matches);

  const matches = useMemo(() => matchData?.items ?? [], [matchData]);
  const day = useMemo(() => focusDate(matches), [matches]);
  const today = matches.filter((m) => m.date === day);
  const live = matches.filter((m) => m.status === 'LIVE');
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

      <div className="stat-strip" style={{ marginBottom: 18 }}>
        <StatTile icon="ball" label="Goals" value={goals} sub="Tournament" spark={[40, 55, 38, 70, 62, 90, 100]} />
        <StatTile icon="whistle" label="Played" value={played} sub={`of ${matches.length}`} />
        <StatTile icon="flame" label="Avg / match" value={avg(goals, played)} sub="Group stage" accent="var(--pos)" />
        <StatTile
          icon="target"
          label="Live now"
          value={live.length}
          sub={live.length ? 'In play' : 'None'}
          accent={live.length ? 'var(--live)' : undefined}
        />
        <StatTile icon="star" label="Watchlist" value={favTeams.length + favPlayers.length} sub="Teams + players" />
      </div>

      <div className="home-grid">
        <div className="grid">
          <AIBrief day={day} todayCount={today.length} liveCount={live.length} />

          <Section title="Live & today" label="Ticker">
            {tickerItems.length ? (
              <Ticker items={tickerItems} />
            ) : (
              <p className="muted" style={{ fontSize: 12.5 }}>
                No fixtures for the focus day.
              </p>
            )}
          </Section>

          <Section
            title="Today's fixtures"
            label={day}
            action={
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Match Center <Icon name="chevR" size={13} />
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
              <h3>My Watchlist</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/favorites' })}>
                Manage
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 8 }}>
              {favTeams.length + favPlayers.length + favMatches.length === 0 ? (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Star teams, players and matches to build your watchlist.
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

          <Section title="Latest results" label="Full time">
            <div className="card card-pad">
              {results.length ? (
                results.map((m) => <MatchRow key={m.id} m={m} />)
              ) : (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  No completed matches yet.
                </p>
              )}
            </div>
          </Section>
        </div>

        {/* rail */}
        <div className="rail">
          <SyncCard sync={sync} />

          {standings && (
            <div className="card">
              <div className="card-hd">
                <Icon name="standings" size={15} style={{ color: 'var(--gold)' }} />
                <h3>Group snapshot</h3>
                <span className="spacer" />
                <button type="button" className="card-link" onClick={() => navigate({ to: '/standings' })}>
                  Full tables
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
              <h3>Top scorers</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/stats' })}>
                All
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {scorers.map((p, i) => (
                <PlayerMini key={p.id} p={p} rank={i + 1} metric={(x) => `${x.goals}G`} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <Icon name="clock" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Upcoming</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Schedule
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

function AIBrief({ day, todayCount, liveCount }: { day: string; todayCount: number; liveCount: number }) {
  const navigate = useNavigate();
  const { data: stats } = useStats();
  const top = stats?.topScorers[0];
  return (
    <div className="card brief">
      <div className="card-hd">
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--gold-soft)',
            color: 'var(--gold)',
          }}
        >
          <Icon name="ai" size={15} />
        </span>
        <h3>AI Match Brief</h3>
        <span className="spacer" />
        <button type="button" className="btn ghost btn-sm" onClick={() => navigate({ to: '/analyst' })}>
          <Icon name="sparkSmall" size={13} /> Open analyst
        </button>
      </div>
      <div className="card-pad brief-body">
        <div className="brief-pt">
          <span className="dot" />
          <span style={{ flex: 1 }}>
            Focus day {day || '—'}: <span className="hl">{todayCount} fixtures</span>
            {liveCount ? (
              <>
                , <span className="hl">{liveCount} live</span> right now
              </>
            ) : null}
            .
          </span>
        </div>
        {top && (
          <div className="brief-pt">
            <span className="dot" />
            <span style={{ flex: 1 }}>
              <span className="hl">{top.name}</span> leads the scoring charts with {top.goals} goals and{' '}
              {top.assists} assists.
            </span>
          </div>
        )}
        <div className="mono-label" style={{ marginTop: 10 }}>
          Generated from local cached data · no external sources
        </div>
      </div>
    </div>
  );
}

function SyncCard({ sync }: { sync: ReturnType<typeof useSyncStatus>['data'] }) {
  const meta = sync?.meta;
  const isMock = sync?.source === 'mock';
  return (
    <div className="card">
      <div className="card-hd">
        <span className={isMock ? 'dot-warn' : 'dot-ok'} />
        <h3>Local cache</h3>
        <span className="spacer" />
        <span className="badge gold">{meta?.cacheStatus ?? 'Open data'}</span>
      </div>
      <div className="card-pad" style={{ paddingTop: 4 }}>
        <div className="sync-row">
          <span className="k">Source</span>
          <span className="num" style={{ fontSize: 12 }}>
            {sync?.source === 'sqlite' ? 'Local SQLite' : 'Open data (CC0)'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Last sync</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.lastSync ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Database</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.db ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Assets loaded</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta ? `${meta.assets.crests} crests · ${meta.assets.flags} flags` : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}
