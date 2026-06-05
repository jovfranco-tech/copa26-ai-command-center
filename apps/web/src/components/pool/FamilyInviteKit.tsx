import { Icon } from '@worldcup/ui';
import { useT } from '@/i18n';

function InviteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mono-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FamilyInviteKit({
  groupId,
  participantCount,
  picked,
  total,
  inviteCopied,
  onCopyInvite,
  onShareInvite,
}: {
  groupId: string;
  participantCount: number;
  picked: number;
  total: number;
  inviteCopied: boolean;
  onCopyInvite: () => void;
  onShareInvite: () => void;
}) {
  const t = useT();
  return (
    <div className="card family-invite-kit">
      <div className="family-invite-main">
        <span className="mono-label">{t('pool.fikInvitation')}</span>
        <strong>{t('pool.groupSubtitle', { g: groupId })}</strong>
        <p>{t('pool.fikShareDesc')}</p>
      </div>
      <div className="family-invite-metrics">
        <InviteMetric label={t('pool.fikMembers')} value={participantCount ? String(participantCount) : '0'} />
        <InviteMetric label={t('pool.fikYourPicks')} value={`${picked}/${total}`} />
        <InviteMetric label={t('matchdayHero.closing')} value={t('pool.fikAtKickoff')} />
      </div>
      <div className="family-invite-actions">
        <button type="button" className="btn gold" onClick={onCopyInvite}>
          <Icon name="share" size={14} />
          {inviteCopied ? t('pool.fsgLinkCopied') : t('pool.fikCopyLink')}
        </button>
        <button type="button" className="btn ghost" onClick={onShareInvite}>
          <Icon name="download" size={14} />
          {t('pool.fikWhatsappCard')}
        </button>
      </div>
    </div>
  );
}
