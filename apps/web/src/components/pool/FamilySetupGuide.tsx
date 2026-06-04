import { Icon, type IconName } from '@worldcup/ui';

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
  const pickReady = total > 0 && picked > 0;
  return (
    <div className="card family-onboarding">
      <div className="family-onboarding-head">
        <div>
          <span className="mono-label">Preparar grupo</span>
          <strong>Lista corta para compartir la quiniela</strong>
        </div>
        <button type="button" className="btn ghost btn-sm" onClick={onInvite}>
          <Icon name="share" size={13} /> {inviteCopied ? 'Link copiado' : 'Copiar invitación'}
        </button>
      </div>
      <div className="family-step-grid">
        <SetupStep done={playerReady} icon="user" title="Alias y foto" text={playerReady ? 'Participante listo.' : 'Escribe tu alias y, si quieres, una URL de avatar.'} />
        <SetupStep done={Boolean(groupId)} icon="shield" title="Grupo" text={`Grupo activo: ${groupId || 'familia-2026'}.`} />
        <SetupStep done={pickReady} icon="target" title="Primeros picks" text={pickReady ? `${picked}/${total} partidos con pronóstico.` : 'Captura al menos un marcador para activar ranking.'} />
        <SetupStep done={syncStatus === 'synced'} icon="cloud" title="Nube compartida" text={syncStatus === 'synced' ? 'Sincronizado en base compartida.' : syncStatus === 'syncing' ? 'Guardando cambios...' : 'Se sincroniza al tener alias.'} />
      </div>
    </div>
  );
}
