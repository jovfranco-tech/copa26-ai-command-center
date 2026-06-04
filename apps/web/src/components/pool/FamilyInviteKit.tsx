import { Icon } from '@worldcup/ui';

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
  return (
    <div className="card family-invite-kit">
      <div className="family-invite-main">
        <span className="mono-label">Invitación</span>
        <strong>Grupo {groupId}</strong>
        <p>Comparte el link, cada persona elige alias/foto y la tabla se arma con resultados reales cuando empiece el torneo.</p>
      </div>
      <div className="family-invite-metrics">
        <InviteMetric label="Miembros" value={participantCount ? String(participantCount) : '0'} />
        <InviteMetric label="Tus picks" value={`${picked}/${total}`} />
        <InviteMetric label="Cierre" value="Al inicio" />
      </div>
      <div className="family-invite-actions">
        <button type="button" className="btn gold" onClick={onCopyInvite}>
          <Icon name="share" size={14} />
          {inviteCopied ? 'Link copiado' : 'Copiar link'}
        </button>
        <button type="button" className="btn ghost" onClick={onShareInvite}>
          <Icon name="download" size={14} />
          Tarjeta WhatsApp
        </button>
      </div>
    </div>
  );
}
