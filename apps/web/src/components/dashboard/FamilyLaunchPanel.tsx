import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@worldcup/ui';
import type { Match } from '@worldcup/shared';
import { useTeamsMap } from '@/hooks';
import { useT } from '@/i18n';
import { shareTextCard } from '@/lib/shareCards';

export function FamilyLaunchPanel({ match }: { match: Match | null }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const t = useT();
  const [sharing, setSharing] = useState(false);

  const shareMatchday = async () => {
    if (!match) return;
    setSharing(true);
    try {
      await shareTextCard({
        title: t('flp.shareTitle'),
        subtitle: `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}`,
        lines: [
          t('flp.shareDate', { date: match.date, time: match.time }),
          t('flp.shareVenue', { venue: match.venue }),
          t('flp.shareAccess'),
        ],
        footer: t('teamDetail.worldcup2026'),
        fileName: `match-of-the-day-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="matchday-launch-strip card">
      <div>
        <span className="mono-label">{t('flp.dayShortcuts')}</span>
        <strong>{t('flp.tagline')}</strong>
      </div>
      <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
        <Icon name="trophy" size={15} /> {t('titles.pool')}
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/tv' })}>
        <Icon name="present" size={15} /> {t('flp.bigScreen')}
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/data' })}>
        <Icon name="database" size={15} /> {t('flp.dataStatus')}
      </button>
      <button type="button" className="btn ghost" onClick={shareMatchday} disabled={!match || sharing}>
        <Icon name="share" size={15} /> {sharing ? t('matchdayHero.creating') : t('common.share')}
      </button>
    </div>
  );
}
