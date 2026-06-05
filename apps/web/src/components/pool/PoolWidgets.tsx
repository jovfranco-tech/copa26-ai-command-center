import { Icon, type IconName } from '@worldcup/ui';
import { type Match } from '@worldcup/shared';
import { lockLabel } from '@/lib/matchMeta';
import { useT } from '@/i18n';
import { type PoolPick } from '@/store/pool';

export function SummaryTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="card card-pad pool-stat">
      <Icon name={icon} size={16} style={{ color: 'var(--gold)' }} />
      <span className="mono-label">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

export function PickHistoryPanel({
  matches,
  picks,
  teams,
}: {
  matches: Match[];
  picks: Record<string, PoolPick>;
  teams: Record<string, { name?: string } | undefined>;
}) {
  const t = useT();
  const picked = matches.filter((m) => picks[m.id]?.outcome).slice(0, 5);
  if (!picked.length) {
    return (
      <div className="card pick-history-panel empty">
        <Icon name="target" size={16} />
        <div>
          <strong>{t('pool.pwHistory')}</strong>
          <p>{t('pool.pwHistoryEmpty')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="card pick-history-panel">
      <div className="pick-history-head">
        <span className="mono-label">{t('pool.pwMyNextPicks')}</span>
        <span className="badge gold">{t('pool.pwRecent', { n: picked.length })}</span>
      </div>
      <div className="pick-history-list">
        {picked.map((m) => {
          const pick = picks[m.id]!;
          return (
            <div key={m.id} className="pick-history-row">
              <span>{teams[m.home]?.name ?? m.home} vs {teams[m.away]?.name ?? m.away}</span>
              <strong className="num">{pick.homeGoals ?? '-'}-{pick.awayGoals ?? '-'}</strong>
              <small>{lockLabel(m, t)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
