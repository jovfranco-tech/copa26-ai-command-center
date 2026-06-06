import { Icon, type IconName } from '@worldcup/ui';
import { type PoolPick } from '@/store/pool';
import { type AnalystAnswer } from '@/lib/analyst';
import { type AIResult } from '@/lib/aiClient';
import { useT } from '@/i18n';

export type NativeAIAction =
  | 'conservative-pool'
  | 'compare-family'
  | 'uncertain-matches'
  | 'day-brief'
  | 'audit-picks'
  | 'family-learning'
  | 'compare-strategies'
  | 'ai-scorecard'
  | 'change-radar';

export interface PendingNativeAction {
  id: NativeAIAction;
  title: string;
  detail: string;
  picks?: Record<string, PoolPick>;
  question: string;
  answer: AnalystAnswer;
  meta: AIResult['meta'];
}

export function AIActionPanel({
  groupId,
  cloudStatus,
  onRun,
}: {
  groupId: string;
  cloudStatus: 'syncing' | 'synced' | 'error';
  onRun: (action: NativeAIAction) => void;
}) {
  const t = useT();
  const actions: Array<{ id: NativeAIAction; icon: IconName; title: string; text: string }> = [
    { id: 'day-brief', icon: 'sparkSmall', title: t('aap.actDayBriefT'), text: t('aap.actDayBriefX') },
    { id: 'conservative-pool', icon: 'target', title: t('aap.actConsT'), text: t('aap.actConsX') },
    { id: 'audit-picks', icon: 'check', title: t('aap.actAuditT'), text: t('aap.actAuditX') },
    { id: 'compare-family', icon: 'trophy', title: t('aap.actCmpFamT'), text: t('aap.actCmpFamX') },
    { id: 'family-learning', icon: 'database', title: t('aap.actLearnT'), text: t('aap.actLearnX') },
    { id: 'compare-strategies', icon: 'stats', title: t('aap.actCmpStratT'), text: t('aap.actCmpStratX') },
    { id: 'change-radar', icon: 'activity', title: t('aap.actRadarT'), text: t('aap.actRadarX') },
    { id: 'ai-scorecard', icon: 'shield', title: t('aap.actScoreT'), text: t('aap.actScoreX') },
    { id: 'uncertain-matches', icon: 'activity', title: t('aap.actUncertainT'), text: t('aap.actUncertainX') },
  ];
  return (
    <div className="ai-action-panel">
      <div className="ai-action-head">
        <div>
          <span className="mono-label">{t('aap.title')}</span>
          <strong>{t('aap.subtitle')}</strong>
        </div>
        <span className={`badge ${cloudStatus === 'synced' ? 'gold' : ''}`}>
          {cloudStatus === 'synced' ? t('aap.sharedMemory', { g: groupId }) : cloudStatus === 'syncing' ? t('aap.syncingMemory') : t('aap.localMemory')}
        </span>
      </div>
      <div className="ai-action-grid">
        {actions.map((action) => (
          <button key={action.id} type="button" className="ai-action-card" onClick={() => onRun(action.id)}>
            <Icon name={action.icon} size={15} />
            <strong>{action.title}</strong>
            <span>{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PendingNativeActionPanel({
  pending,
  onApply,
  onCancel,
}: {
  pending: PendingNativeAction | null;
  onApply: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  if (!pending) return null;
  const entries = Object.entries(pending.picks ?? {});
  return (
    <div className="pending-ai-action">
      <div className="pending-ai-action-main">
        <Icon name="shield" size={15} />
        <div>
          <span className="mono-label">{t('aap.previewBeforeApply')}</span>
          <strong>{pending.title}</strong>
          <p>{pending.detail}</p>
        </div>
      </div>
      {entries.length ? (
        <div className="pending-pick-strip">
          {entries.slice(0, 5).map(([matchId, pick]) => (
            <span key={matchId}>
              <strong>{matchId}</strong> {pick.homeGoals ?? '-'}-{pick.awayGoals ?? '-'} · {pick.outcome ?? t('pool.noWinner')}
            </span>
          ))}
          {entries.length > 5 ? <span>{t('aap.more', { n: entries.length - 5 })}</span> : null}
        </div>
      ) : null}
      <div className="pending-ai-actions">
        <button type="button" className="btn gold" onClick={onApply}>
          <Icon name="check" size={14} /> {t('aap.applyChanges')}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          <Icon name="close" size={14} /> {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
