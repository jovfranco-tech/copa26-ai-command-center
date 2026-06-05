import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, StatusBadge } from '@worldcup/ui';
import { fmtFull, type Match } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit } from '@/components/identity';
import { useTeamsMap, useVenuesMap } from '@/hooks';
import { useT, type Translate } from '@/i18n';
import { h2hSummary, isMatchLocked, lockLabel, matchSourceInfo, venuePhotoSrc, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { shareTextCard } from '@/lib/shareCards';
import { usePool } from '@/store/pool';
import { DataSourceBadge } from './DataSourceBadge';

function confLabel(confidence: string, t: Translate): string {
  return confidence === 'Alta'
    ? t('sourceBadge.high')
    : confidence === 'Media'
      ? t('sourceBadge.medium')
      : confidence === 'Manual'
        ? t('sourceBadge.manual')
        : t('sourceBadge.pending');
}

export function MatchdayHero({ match, variant = 'featured' }: { match: Match | null; variant?: 'featured' | 'compact' }) {
  const navigate = useNavigate();
  const t = useT();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const picks = usePool((s) => s.picks);

  const meta = useMemo(() => (match ? matchSourceInfo(match, t) : null), [match, t]);
  const weather = useMemo(() => (match ? weatherSummary(match.id, t) : null), [match, t]);
  const h2h = useMemo(() => (match ? h2hSummary(match.home, match.away, t) : null), [match, t]);
  const countdown = useMemo(() => (match ? countdownLabel(match, now, t) : ''), [match, now, t]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  if (!match) return null;

  const home = teams[match.home];
  const away = teams[match.away];
  const venue = venues[match.venue];
  const photo = venuePhotoSrc(match.venue);
  const played = match.status !== 'UPCOMING';
  const pick = picks[match.id];
  const pickComplete = pick?.homeGoals != null && pick?.awayGoals != null;
  const locked = isMatchLocked(match);
  const pickLabel = pickComplete
    ? `${pick.homeGoals}-${pick.awayGoals}`
    : pick?.outcome
      ? outcomeName(pick.outcome, t)
      : t('data.pending');
  const nextAction = played ? t('matchdayHero.reviewResult') : pickComplete ? t('matchdayHero.adjustPrediction') : t('matchdayHero.capturePick');
  const goNextAction = () => {
    if (played) {
      navigate({ to: '/matches/$matchId', params: { matchId: match.id } });
      return;
    }
    navigate({ to: '/pool' });
  };

  const shareMatch = async () => {
    setSharing(true);
    try {
      await shareTextCard({
        title: `${home?.name ?? match.home} vs ${away?.name ?? match.away}`,
        subtitle: `${fmtFull(match.date)} · ${venueTimeLabel(match, t)}`,
        lines: [
          `${venue?.stadium ?? t('matchdayHero.venueTBC')}, ${venue?.city ?? ''}`,
          weather ? t('matchdayHero.weatherLine', { label: weather.label }) : t('matchMeta.weatherPending'),
          h2h?.label ?? t('matchdayHero.h2hLinePending'),
          played ? t('matchdayHero.scoreLine', { score: `${match.homeGoals ?? 0}-${match.awayGoals ?? 0}` }) : t('matchdayHero.readyForPool'),
        ],
        fileName: `match-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className={`matchday-hero ${variant}`} style={photo ? { '--hero-img': `url(${photo})` } as React.CSSProperties : undefined}>
      <div className="matchday-bg" />
      <div className="matchday-content">
        <div className="matchday-copy">
          <div className="row gap-8 wrap">
            <StatusBadge status={match.status} minute={match.minute} time={match.time} />
            <span className="mono-label">{match.stage} · {match.round}</span>
            {meta && <DataSourceBadge {...meta} compact />}
          </div>
          <h2>{t('matchdayHero.matchday')}</h2>
          <p>{venue?.stadium ?? t('matchdayHero.venueTBC')} · {venue?.city ?? t('matchdayHero.cityTBC')} · {fmtFull(match.date)}</p>
          <div className="matchday-command-strip">
            <span><Icon name="clock" size={13} /> {t('matchdayHero.countdown')} <strong>{countdown}</strong></span>
            <span><Icon name="rain" size={13} /> {weather?.label ?? t('matchMeta.weatherPending')}</span>
            <span><Icon name="shield" size={13} /> {meta ? confLabel(meta.confidence, t) : t('matchdayHero.confidencePending')}</span>
          </div>
        </div>

        <div className="matchday-scoreboard">
          <div className="matchday-team">
            <TeamCrest code={match.home} size={58} />
            <TeamFlag code={match.home} size={15} />
            <strong>{home?.name ?? match.home}</strong>
            <TeamKit code={match.home} size={42} />
          </div>
          <div className="matchday-center">
            {played ? (
              <span className="matchday-score num">{match.homeGoals ?? 0}<b>–</b>{match.awayGoals ?? 0}</span>
            ) : (
              <>
                <span className="matchday-time num">{match.time}</span>
                <span className="mono-label">{venueTimeLabel(match, t)}</span>
              </>
            )}
          </div>
          <div className="matchday-team away">
            <TeamCrest code={match.away} size={58} />
            <TeamFlag code={match.away} size={15} />
            <strong>{away?.name ?? match.away}</strong>
            <TeamKit code={match.away} size={42} />
          </div>
        </div>

        <div className="matchday-intel">
          <InfoTile icon="rain" label={t('matchdayHero.labelWeather')} value={weather?.label ?? t('data.pending')} sub={weather?.detail ?? t('matchdayHero.forecastNearPending')} />
          <InfoTile icon="pin" label={t('matchdayHero.labelVenue')} value={venue?.stadium ?? t('matchdayHero.tbc')} sub={venue?.city ?? t('matchdayHero.cityPending')} />
          <InfoTile icon="activity" label={t('matchdayHero.labelH2h')} value={h2h?.label ?? t('data.pending')} sub={h2h?.source ?? t('matchdayHero.h2hPipeline')} />
        </div>

        <div className="matchday-focus-panel">
          <div>
            <span className="mono-label">{t('matchdayHero.yourPool')}</span>
            <strong>{pickLabel}</strong>
            <small>{pickComplete ? t('matchdayHero.readyToShare') : t('matchdayHero.needComplete')}</small>
          </div>
          <div>
            <span className="mono-label">{t('matchdayHero.closing')}</span>
            <strong>{locked || played ? t('matchdayHero.closed') : t('matchdayHero.open')}</strong>
            <small>{lockLabel(match, t)}</small>
          </div>
          <div>
            <span className="mono-label">{t('matchdayHero.dataConfidence')}</span>
            <strong>{meta ? confLabel(meta.confidence, t) : t('data.pending')}</strong>
            <small>{meta?.source ?? t('standings.localDataset')}</small>
          </div>
          <button type="button" className="btn gold" onClick={goNextAction}>
            <Icon name={played ? 'calendar' : 'target'} size={15} />
            {nextAction}
          </button>
        </div>

        <div className="matchday-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={15} /> {t('matchdayHero.goToPool')}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: match.id } })}>
            <Icon name="calendar" size={15} /> {t('common.viewMatch')}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/tv' })}>
            <Icon name="present" size={15} /> {t('titles.tv')}
          </button>
          <button type="button" className="btn ghost" onClick={shareMatch} disabled={sharing}>
            <Icon name="share" size={15} /> {sharing ? t('matchdayHero.creating') : t('common.share')}
          </button>
        </div>
      </div>
    </section>
  );
}

function outcomeName(outcome: 'home' | 'draw' | 'away', t: Translate): string {
  if (outcome === 'home') return t('matchdayHero.winHome');
  if (outcome === 'away') return t('matchdayHero.winAway');
  return t('matchdayHero.draw');
}

function countdownLabel(match: Match, now: number, t: Translate): string {
  if (match.status === 'LIVE') return t('matchdayHero.inPlay');
  if (match.status === 'FT') return t('matchdayHero.finished');
  const kickoff = Date.parse(`${match.date}T${match.time || '00:00'}:00`);
  if (!Number.isFinite(kickoff)) return t('matchdayHero.tbc');
  const diff = kickoff - now;
  if (diff <= 0) return t('matchdayHero.aboutToStart');
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function InfoTile({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="matchday-info-tile">
      <Icon name={icon} size={15} />
      <span className="mono-label">{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
