import { Icon, type IconName } from '@worldcup/ui';
import { useT } from '@/i18n';

function SetupStep({ done, icon, title, text }: { done: boolean; icon: IconName; title: string; text: string }) {
  return (
    <div className={`family-step${done ? ' done' : ''}`}>
      <span className="family-step-icon"><Icon name={done ? 'check' : icon} size={14} /></span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function FamilySetupGuide({
  playerReady,
  groupId,
  picked,
  total,
  syncStatus,
  inviteCopied,
  onInvite,
}: {
  playerReady: boolean;
  groupId: string;
  picked: number;
  total: number;
  syncStatus: 'synced' | 'syncing' | 'error' | null;
  inviteCopied: boolean;
  onInvite: () => void;
}) {
  const t = useT();
  const pickReady = total > 0 && picked > 0;
  return (
    <div className="card family-onboarding">
      <div className="family-onboarding-head">
        <div>
          <span className="mono-label">{t('pool.fsgPrepareGroup')}</span>
          <strong>{t('pool.fsgShortList')}</strong>
        </div>
        <button type="button" className="btn ghost btn-sm" onClick={onInvite}>
          <Icon name="share" size={13} /> {inviteCopied ? t('pool.fsgLinkCopied') : t('pool.fsgCopyInvite')}
        </button>
      </div>
      <div className="family-step-grid">
        <SetupStep done={playerReady} icon="user" title={t('pool.fsgAliasPhoto')} text={playerReady ? t('pool.fsgParticipantReady') : t('pool.fsgAliasHint')} />
        <SetupStep done={Boolean(groupId)} icon="shield" title={t('pool.group')} text={t('pool.fsgActiveGroup', { g: groupId || 'familia-2026' })} />
        <SetupStep done={pickReady} icon="target" title={t('pool.fsgFirstPicks')} text={pickReady ? t('pool.fsgPicksProgress', { picked, total }) : t('pool.fsgCaptureHint')} />
        <SetupStep done={syncStatus === 'synced'} icon="cloud" title={t('pool.alertCloud')} text={syncStatus === 'synced' ? t('pool.fsgSynced') : syncStatus === 'syncing' ? t('pool.fsgSyncingChanges') : t('pool.fsgSyncOnAlias')} />
      </div>
    </div>
  );
}
