import { Icon } from '@worldcup/ui';

/**
 * Forward-looking banner for data-dependent pages (stats, standings) while the
 * tournament hasn't kicked off. It self-hides from opening day onward, so once
 * real results are ingested + redeployed the zero states are replaced by data.
 */
const OPENING_ISO = '2026-06-11T11:00:00-06:00';

export function PreTournamentNotice({ context = 'Las estadísticas' }: { context?: string }) {
  const days = Math.max(0, Math.ceil((new Date(OPENING_ISO).getTime() - Date.now()) / 86_400_000));
  if (days <= 0) return null;

  return (
    <div
      className="card card-pad"
      style={{
        marginBottom: 16,
        borderColor: 'var(--gold-line)',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.08), transparent 72%)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(212,175,55,0.14)',
          color: 'var(--gold)',
          flex: 'none',
        }}
      >
        <Icon name="trophy" size={22} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{context} se activan el 11 de junio</div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
          Faltan <strong style={{ color: 'var(--gold)' }}>{days} día{days === 1 ? '' : 's'}</strong> para el
          arranque del Mundial 2026. Goleadores, asistencias, tarjetas y la tabla se llenan automáticamente
          conforme se juegan los partidos.
        </div>
      </div>
    </div>
  );
}
