import { Icon } from '@worldcup/ui';
import { MOCK_BANNER } from '@worldcup/shared';
import { useSyncStatus } from '@/hooks';

/** Pre-tournament note shown when data comes from the bundled open dataset
 *  (i.e. not a populated local SQLite store). */
export function MockBanner() {
  const { data } = useSyncStatus();
  if (data && data.source === 'sqlite') return null;
  return (
    <div className="mock-banner" role="status">
      <Icon name="info" size={16} style={{ color: 'var(--gold-2)' }} />
      <span>{MOCK_BANNER}</span>
    </div>
  );
}
