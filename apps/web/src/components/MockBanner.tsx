import { Icon } from '@worldcup/ui';
import { useSyncStatus } from '@/hooks';
import { useT } from '@/i18n';

/** Pre-tournament note shown when data comes from the bundled open dataset
 *  (i.e. not a populated local SQLite store). */
export function MockBanner() {
  const { data } = useSyncStatus();
  const t = useT();
  if (data && data.source === 'sqlite') return null;
  return (
    <div className="mock-banner" role="status">
      <Icon name="info" size={16} style={{ color: 'var(--gold-2)' }} />
      <span>{t('data.mockBanner')}</span>
    </div>
  );
}
