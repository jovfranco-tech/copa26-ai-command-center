import { Icon } from '@worldcup/ui';
import { MOCK_BANNER } from '@worldcup/shared';
import { useSyncStatus } from '@/hooks';

/** Shown whenever the API is serving mock data (no SQLite loaded yet). */
export function MockBanner() {
  const { data } = useSyncStatus();
  if (data && data.source !== 'mock') return null;
  return (
    <div className="mock-banner" role="status">
      <Icon name="info" size={16} style={{ color: 'var(--gold-2)' }} />
      <span>
        {MOCK_BANNER} Run <code>pnpm db:migrate &amp;&amp; pnpm db:seed</code> or the{' '}
        <code>pnpm ingest:*</code> scripts to load local data.
      </span>
    </div>
  );
}
