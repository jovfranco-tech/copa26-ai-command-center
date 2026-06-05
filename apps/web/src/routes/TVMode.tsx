import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull, fmtLongDate, fmtTime, type Match } from '@worldcup/shared';
import { MatchdayHero } from '@/components/MatchdayHero';
import { TeamCrest, TeamKit } from '@/components/identity';
import { useMatches, useTeamsMap, useVenuesMap } from '@/hooks';
import {
  broadcastImportanceLabel,
  broadcastImportanceScore,
  featuredBroadcastMatches,
  getBroadcastGuide,
  type BroadcastProvider,
} from '@/lib/broadcasts';
import { focusMatch, sortMatches, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { useT } from '@/i18n';

export function TVMode() {
  const navigate = useNavigate();
  const t = useT();
  const { data, isLoading } = useMatches();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const matches = useMemo(() => data?.items ?? [], [data]);
  const focus = useMemo(() => focusMatch(matches), [matches]);
  const next = useMemo(() => sortMatches(matches).filter((m) => m.status === 'UPCOMING').slice(0, 6), [matches]);
  const featuredBroadcasts = useMemo(() => featuredBroadcastMatches(matches, 6), [matches]);

  if (isLoading) return <p className="muted">{t('tvMode.loading')}</p>;

  return (
    <div className="page-fade tv-mode">
      <div className="tv-header">
        <div>
          <span className="mono-label">{t('titles.tv')}</span>
          <h2>{t('tvMode.bigScreenCenter')}</h2>
        </div>
        <div className="tv-clock">
          <span className="num">{fmtTime(now)}</span>
          <small>{fmtLongDate(now.toISOString().slice(0, 10))}</small>
        </div>
      </div>

      <TVBroadcastPanel match={focus} featured={featuredBroadcasts} />
      <MatchdayHero match={focus} />
      <TVFamilyStrip match={focus} onPool={() => navigate({ to: '/pool' })} onData={() => navigate({ to: '/data' })} />

      <div className="tv-grid">
        {next.map((m) => {
          const weather = weatherSummary(m.id, t);
          return (
            <div key={m.id} className={`tv-match-card card${broadcastImportanceScore(m) >= 45 ? ' broadcast-priority' : ''}`}>
              <div className="row gap-8 wrap">
                <StatusBadge status={m.status} minute={m.minute} time={m.time} />
                <span className="mono-label">{fmtFull(m.date)}</span>
                {broadcastImportanceScore(m) >= 45 && <span className="match-chip">{t('tvMode.featuredTv')}</span>}
              </div>
              <div className="tv-match-teams">
                <span>
                  <TeamCrest code={m.home} size={42} />
                  <strong>{teams[m.home]?.name ?? m.home}</strong>
                  <TeamKit code={m.home} size={34} />
                </span>
                <b className="num">{m.time}</b>
                <span>
                  <TeamCrest code={m.away} size={42} />
                  <strong>{teams[m.away]?.name ?? m.away}</strong>
                  <TeamKit code={m.away} size={34} />
                </span>
              </div>
              <div className="tv-match-foot">
                <span><Icon name="pin" size={13} /> {venues[m.venue]?.stadium ?? t('matchCenter.venue')}</span>
                <span><Icon name="rain" size={13} /> {weather.label}</span>
                <span>{venueTimeLabel(m, t)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TVBroadcastPanel({ match, featured }: { match: Match | null; featured: Match[] }) {
  const teams = useTeamsMap();
  const t = useT();
  const guide = useMemo(() => getBroadcastGuide(match, t), [match, t]);
  const matchTitle = match ? `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}` : t('tvMode.featuredMatch');
  const prio = guide.priority === 'Alta' ? t('sourceBadge.high') : guide.priority === 'Media' ? t('sourceBadge.medium') : t('tvMode.priorityNormal');
  return (
    <section className="tv-broadcast-panel card">
      <div className="tv-broadcast-main">
        <div className="tv-broadcast-screen" aria-label={t('tvMode.officialAccessAria')}>
          <div className="tv-broadcast-glow" />
          <div className="tv-broadcast-play" aria-hidden="true" style={{ pointerEvents: 'none', opacity: 0.4 }}>
            <Icon name="play" size={30} />
          </div>
          <span className="mono-label">{t('broadcasts.official')}</span>
          <strong>{matchTitle}</strong>
          <small>{guide.headline} · {t('tvMode.priorityLine', { p: prio })} · {t('tvMode.authorizedHubs')}</small>
        </div>

        <div className="tv-broadcast-copy">
          <span className="mono-label">{t('tvMode.whereToWatch')}</span>
          <h3>{matchTitle}</h3>
          <p>{guide.note}</p>
          <div className="tv-broadcast-actions">
            {guide.providers.slice(0, 3).map((provider, index) => (
              <a key={provider.id} className={`btn ${index === 0 ? 'gold' : 'ghost'}`} href={provider.url} target="_blank" rel="noreferrer">
                <Icon name={index === 0 ? 'play' : 'arrowR'} size={14} />
                {provider.label}
              </a>
            ))}
          </div>
          <div className="tv-provider-grid">
            {guide.providers.map((provider) => (
              <BroadcastProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
          <div className="tv-broadcast-source">
            <span>{t('tvMode.reviewableSources')}</span>
            {guide.providers.map((provider) => (
              <a key={provider.id} href={provider.sourceUrl} target="_blank" rel="noreferrer">
                {provider.sourceLabel}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="tv-featured-strip">
        <div>
          <span className="mono-label">{t('tvMode.importantGames')}</span>
          <strong>{t('tvMode.quickAccess')}</strong>
        </div>
        <div className="tv-featured-list">
          {featured.map((item) => (
            <a key={item.id} href={guide.providers[0]?.url} target="_blank" rel="noreferrer" title={t('tvMode.openProvider')}>
              <span>{broadcastImportanceLabel(item, teams, t)}</span>
              <b>{teams[item.home]?.name ?? item.home} vs {teams[item.away]?.name ?? item.away}</b>
              <small>{fmtFull(item.date)} · {item.time}</small>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function BroadcastProviderCard({ provider }: { provider: BroadcastProvider }) {
  const t = useT();
  return (
    <a className="tv-provider-card" href={provider.url} target="_blank" rel="noreferrer">
      <span className="mono-label">{provider.region} · {provider.language}</span>
      <strong>{provider.label}</strong>
      <small>{provider.note}</small>
      <em>
        {t('tvMode.open', { platform: provider.platform })}
        <Icon name="arrowR" size={12} />
      </em>
    </a>
  );
}

function TVFamilyStrip({ match, onPool, onData }: { match: Match | null; onPool: () => void; onData: () => void }) {
  const t = useT();
  return (
    <div className="tv-family-strip card">
      <div>
        <span className="mono-label">{t('tvMode.roomView')}</span>
        <strong>{match ? `${match.home} vs ${match.away}` : t('tvMode.featuredMatch')}</strong>
        <p>{t('tvMode.roomViewDesc')}</p>
      </div>
      <button type="button" className="btn gold" onClick={onPool}>
        <Icon name="trophy" size={15} /> {t('dashboard.openPool')}
      </button>
      <button type="button" className="btn ghost" onClick={onData}>
        <Icon name="database" size={15} /> {t('tvMode.dataHealth')}
      </button>
    </div>
  );
}
