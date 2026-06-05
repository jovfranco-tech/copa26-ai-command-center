import { Icon, type IconName } from '@worldcup/ui';
import { fmtTime } from '@worldcup/shared';
import { useT } from '@/i18n';

interface PoolAlert {
  icon: IconName;
  title: string;
  text: string;
  tone: 'ok' | 'warn' | 'info';
}

interface PoolAward {
  icon: IconName;
  title: string;
  text: string;
  active: boolean;
}

export function PoolCommandCenter({
  alerts,
  awards,
  picked,
  total,
  completeScores,
  lastSavedAt,
  onSharePick,
  onShareTable,
  onShareAchievement,
}: {
  alerts: PoolAlert[];
  awards: PoolAward[];
  picked: number;
  total: number;
  completeScores: number;
  lastSavedAt: string | null;
  onSharePick: () => void;
  onShareTable: () => void;
  onShareAchievement: () => void;
}) {
  const t = useT();
  const pct = total ? Math.round((picked / total) * 100) : 0;
  return (
    <div className="card pool-command-center">
      <div className="pool-command-head">
        <div>
          <span className="mono-label">{t('nav.groupCommand')}</span>
          <strong>{t('pool.pccPctWithPick', { pct })}</strong>
          <p>{t('pool.pccScoresComplete', { n: completeScores, total })} {lastSavedAt ? t('pool.pccSavedAt', { time: fmtTime(lastSavedAt) }) : t('pool.pccSavePending')}</p>
        </div>
        <div className="pool-command-actions">
          <button type="button" className="btn gold" onClick={onSharePick}>
            <Icon name="share" size={14} />
            Pick
          </button>
          <button type="button" className="btn ghost" onClick={onShareTable}>
            <Icon name="trophy" size={14} />
            {t('pool.tableTitle')}
          </button>
          <button type="button" className="btn ghost" onClick={onShareAchievement}>
            <Icon name="sparkSmall" size={14} />
            {t('pool.pccAchievement')}
          </button>
        </div>
      </div>
      <div className="pool-progress-track" aria-label={t('pool.pccProgress', { pct })}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="pool-alert-grid">
        {alerts.map((alert) => (
          <div key={`${alert.title}-${alert.text}`} className={`pool-alert ${alert.tone}`}>
            <Icon name={alert.icon} size={15} />
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pool-award-grid">
        {awards.map((award) => (
          <div key={award.title} className={`pool-award${award.active ? ' active' : ''}`}>
            <Icon name={award.icon} size={15} />
            <div>
              <strong>{award.title}</strong>
              <p>{award.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
