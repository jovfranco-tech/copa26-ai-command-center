import { Icon } from '@worldcup/ui';
import { useT } from '@/i18n';

/**
 * Forward-looking banner for data-dependent pages (stats, standings) while the
 * tournament hasn't kicked off. It self-hides from opening day onward, so once
 * real results are ingested + redeployed the zero states are replaced by data.
 */
const OPENING_ISO = '2026-06-11T11:00:00-06:00';

export function PreTournamentNotice({ contextKey = 'stats' }: { contextKey?: 'standings' | 'stats' }) {
  const t = useT();
  const days = Math.max(0, Math.ceil((new Date(OPENING_ISO).getTime() - Date.now()) / 86_400_000));
  if (days <= 0) return null;

  const context = contextKey === 'standings' ? t('preTournament.contextStandings') : t('preTournament.contextStats');

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
        <div style={{ fontWeight: 800, fontSize: 15 }}>{t('preTournament.activate', { context })}</div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.45 }}>
          {t('preTournament.countdownPrefix')}
          <strong style={{ color: 'var(--gold)' }}>
            {days} {days === 1 ? t('preTournament.day') : t('preTournament.days')}
          </strong>{' '}
          {t('preTournament.countdownSuffix')}
        </div>
      </div>
    </div>
  );
}
