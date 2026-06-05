import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Empty, Form, cn } from '@worldcup/ui';
import { fmtGD, type Match, type Player } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit, FavStar } from '@/components/identity';
import { PlayerCard, MatchRow, StandingsTable } from '@/components/cards';
import { coachProfiles } from '@/generated/intelPacks';
import { downloadedTeamKitVariantExts, teamKitVariants, type TeamKitVariant } from '@/generated/teamKits';
import { useMatches, usePlayers, useStandings, useTeam, useVenuesMap } from '@/hooks';
import { useT } from '@/i18n';
import { playerRatings } from '@/lib/ratings';

type Tab = 'profile' | 'squad' | 'fixtures' | 'kits' | 'group';

export function TeamDetail({ code }: { code: string }) {
  const navigate = useNavigate();
  const t = useT();
  const { data: teamData, isLoading } = useTeam(code);
  const { data: players } = usePlayers({ team: code });
  const { data: matches } = useMatches({ team: code });
  const { data: standings } = useStandings();
  const [tab, setTab] = useState<Tab>('profile');

  if (isLoading) return <p className="muted">{t('teamDetail.loading')}</p>;
  const team = teamData?.item;
  if (!team) return <Empty icon="teams" title={t('teamDetail.notFoundTitle')} text={t('teamDetail.notFoundText')} />;

  const groupRows = standings?.groups[team.group] ?? [];
  const row = groupRows.find((r) => r.team === code);
  const squad = players?.items ?? [];
  const fixtures = (matches?.items ?? []).sort((a, b) => a.date.localeCompare(b.date));
  const coach = coachProfiles.items[code as keyof typeof coachProfiles.items];

  return (
    <div className="page-fade">
      <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${team.colorA}, ${team.colorB})` }} />
        <div className="card-pad">
          <div className="row gap-16 wrap">
            <TeamCrest code={code} size={72} />
            <TeamKit code={code} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row gap-10">
                <TeamFlag code={code} size={20} />
                <h2 style={{ margin: 0, fontSize: 22 }}>{team.name}</h2>
                <FavStar kind="teams" id={code} size={22} />
              </div>
              <div className="mono-label" style={{ marginTop: 4 }}>
                {t('cards.group', { g: team.group })} · {team.confederation ?? t('teamDetail.worldcup2026')}
              </div>
            </div>
            {row && (
              <div className="row gap-16">
                <Stat label={t('table.pts')} value={row.Pts} />
                <Stat label={t('table.wdl')} value={`${row.W}-${row.D}-${row.L}`} />
                <Stat label={t('table.gd')} value={fmtGD(row.GD)} />
                <div>
                  <div className="mono-label">{t('table.form')}</div>
                  <div style={{ marginTop: 4 }}>
                    <Form list={row.form} />
                  </div>
                </div>
              </div>
            )}
            {coach?.name && (
              <a
                href={coach.pageUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="coach-chip"
                title={t('teamDetail.coachPublicProfile')}
              >
                {coach.photo ? <img src={coach.photo} alt={coach.name} loading="lazy" decoding="async" /> : null}
                <span>
                  <span className="mono-label">{t('teamDetail.coach')}</span>
                  <strong>{coach.name}</strong>
                </span>
              </a>
            )}
          </div>
          <KitStrip code={code} />
        </div>
      </div>

      <div className="row gap-6 wrap" style={{ marginBottom: 14 }}>
        {(['profile', 'squad', 'fixtures', 'kits', 'group'] as Tab[]).map((tb) => (
          <button key={tb} type="button" className={cn('pill', tab === tb && 'on')} onClick={() => setTab(tb)}>
            {tb === 'profile' ? t('teamDetail.tabProfile') : tb === 'squad' ? t('teamDetail.tabSquad') : tb === 'fixtures' ? t('teamDetail.tabFixtures') : tb === 'kits' ? t('teamDetail.tabKits') : t('teamDetail.tabGroup')}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <TeamProfile code={code} players={squad} fixtures={fixtures} coach={coach} ranking={team.ranking} />
      )}

      {tab === 'squad' &&
        (squad.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {squad.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Empty icon="players" title={t('teamDetail.noSquadTitle')} text={t('teamDetail.noSquadText')} />
        ))}

      {tab === 'fixtures' && (
        <div className="card card-pad">
          {fixtures.length ? (
            fixtures.map((m) => <MatchRow key={m.id} m={m} />)
          ) : (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              {t('teamDetail.noFixtures')}
            </p>
          )}
        </div>
      )}

      {tab === 'kits' && (
        <div className="card card-pad team-kits-panel">
          <KitStrip code={code} force />
        </div>
      )}

      {tab === 'group' && (
        <div className="card">
          <div className="card-hd">
            <Icon name="standings" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('cards.group', { g: team.group })}</h3>
            <span className="spacer" />
            <button type="button" className="card-link" onClick={() => navigate({ to: '/standings' })}>
              {t('matchCenter.allGroups')}
            </button>
          </div>
          <div className="card-pad">
            <StandingsTable rows={groupRows} highlight={code} />
          </div>
        </div>
      )}
    </div>
  );
}

function TeamProfile({
  code,
  players,
  fixtures,
  coach,
  ranking,
}: {
  code: string;
  players: Player[];
  fixtures: Match[];
  coach: { name: string | null; photo: string | null; summary?: string | null } | undefined;
  ranking: number | null;
}) {
  const t = useT();
  const venues = useVenuesMap();
  const ratings = players.map((p) => ({ player: p, rating: playerRatings(p) })).sort((a, b) => b.rating.overall - a.rating.overall);
  const avgRating = ratings.length ? Math.round(ratings.reduce((sum, row) => sum + row.rating.overall, 0) / ratings.length) : 0;
  const realRatings = ratings.filter((row) => row.rating.source === 'fc26').length;
  const star = ratings[0];
  const next = fixtures.find((m) => m.status === 'UPCOMING');
  const nextVenue = next ? venues[next.venue] : null;
  const positionCounts = players.reduce<Record<string, number>>((acc, player) => {
    acc[player.pos] = (acc[player.pos] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid team-profile-grid">
      <div className="card card-pad profile-main-card">
        <span className="mono-label">{t('teamDetail.teamProfile')}</span>
        <h3>{code}</h3>
        <div className="profile-kpis">
          <ProfileKpi label={t('teamDetail.avgRating')} value={avgRating || '—'} />
          <ProfileKpi label={t('teamDetail.ranking')} value={ranking ?? t('data.pending')} />
          <ProfileKpi label={t('teamDetail.squad')} value={players.length} />
        </div>
        <div className="divider" />
        {star ? (
          <div className="row gap-12 wrap">
            <span className="badge gold">{t('teamDetail.star')}</span>
            <strong>{star.player.name}</strong>
            <span className="mono-label">{star.player.club}</span>
            <span className="num tx-gold">{star.rating.overall}</span>
          </div>
        ) : (
          <p className="muted">{t('teamDetail.starHint')}</p>
        )}
      </div>
      <div className="card card-pad">
        <span className="mono-label">{t('teamDetail.coach')}</span>
        <div className="row gap-12" style={{ marginTop: 10 }}>
          {coach?.photo ? <img src={coach.photo} alt={coach.name ?? t('teamDetail.coach')} className="profile-coach-photo" loading="lazy" /> : null}
          <div>
            <strong>{coach?.name ?? t('data.pending')}</strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>{coach?.summary ?? t('teamDetail.coachSummaryPending')}</p>
          </div>
        </div>
      </div>
      <div className="card card-pad">
        <span className="mono-label">{t('teamDetail.nextMatch')}</span>
        {next ? (
          <div style={{ marginTop: 10 }}>
            <strong>{next.home} vs {next.away}</strong>
            <div className="mono-label">{next.date} · {next.time}</div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>
              {nextVenue ? `${nextVenue.stadium}, ${nextVenue.city}` : t('teamDetail.venuePending')}
            </p>
          </div>
        ) : (
          <p className="muted">{t('teamDetail.noNextMatch')}</p>
        )}
      </div>
      <div className="card card-pad">
        <span className="mono-label">{t('teamDetail.squadByLines')}</span>
        <div className="position-stack">
          {['GK', 'DF', 'MF', 'FW'].map((pos) => (
            <div key={pos}>
              <span>{pos}</span>
              <strong className="num">{positionCounts[pos] ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <span className="mono-label">{t('teamDetail.ratingsTrust')}</span>
        <div className="rating-trust-meter">
          <strong>{realRatings}/{players.length || 0}</strong>
          <span>{t('teamDetail.ratingsTrustText')}</span>
        </div>
      </div>
    </div>
  );
}

function ProfileKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="mono-label">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

function KitStrip({ code, force = false }: { code: string; force?: boolean }) {
  const t = useT();
  const variants = (['home', 'away', 'third'] as TeamKitVariant[]).filter(
    (variant) => downloadedTeamKitVariantExts[code]?.[variant] || teamKitVariants[code]?.[variant],
  );
  if (variants.length <= 1 && !force) return null;
  const visible = variants.length ? variants : (['home'] as TeamKitVariant[]);
  const label: Record<TeamKitVariant, string> = {
    home: t('teamDetail.kitHome'),
    away: t('teamDetail.kitAway'),
    third: t('teamDetail.kitThird'),
    gk: t('teamDetail.kitGk'),
  };
  return (
    <div className="kit-strip">
      {visible.map((variant) => (
        <div key={variant} className="kit-variant">
          <TeamKit code={code} variant={variant} size={42} />
          <span className="mono-label">{label[variant]}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}
