import { Icon } from '@worldcup/ui';
import type { Match } from '@worldcup/shared';
import { useT } from '@/i18n';

export function TournamentTimeline({ matches }: { matches: Match[] }) {
  const t = useT();
  const groupMatches = matches.filter((m) => m.stage.toLowerCase().includes('group'));
  const first = groupMatches[0]?.date ?? '2026-06-11';
  const last = groupMatches[groupMatches.length - 1]?.date ?? '2026-06-24';
  const played = matches.filter((m) => m.status === 'FT').length;

  const steps = [
    { label: t('timeline.groups'), date: `${first} - ${last}`, status: played ? 'live' : 'next', note: t('timeline.matchesLoaded', { n: groupMatches.length }) },
    { label: t('bracket.r32'), date: t('timeline.fromDate', { date: '2026-06-28' }), status: 'wait', note: t('timeline.filledReal') },
    { label: t('bracket.r16'), date: t('timeline.july2026'), status: 'wait', note: t('timeline.crossesTBD') },
    { label: t('bracket.qf'), date: t('timeline.july2026'), status: 'wait', note: t('timeline.crossesTBD') },
    { label: t('bracket.sf'), date: t('timeline.july2026'), status: 'wait', note: t('timeline.crossesTBD') },
    { label: t('bracket.f'), date: '2026-07-19', status: 'cup', note: t('timeline.cupToChampion') },
  ] as const;

  return (
    <div className="card tournament-timeline">
      <div className="card-hd">
        <Icon name="route" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{t('timeline.title')}</h3>
        <span className="spacer" />
        <span className="mono-label">{t('timeline.playedCount', { played, total: matches.length })}</span>
      </div>
      <div className="timeline-track">
        {steps.map((step) => (
          <div key={step.label} className={`timeline-step ${step.status}`}>
            <span className="timeline-dot">
              <Icon name={step.status === 'cup' ? 'trophy' : step.status === 'next' ? 'calendar' : 'clock'} size={14} />
            </span>
            <strong>{step.label}</strong>
            <span className="mono-label">{step.date}</span>
            <p>{step.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
