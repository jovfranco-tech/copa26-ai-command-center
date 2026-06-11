import { Icon } from '@worldcup/ui';
import { useSyncStatus } from '@/hooks';
import { useT } from '@/i18n';

/** Pre-tournament note shown when data comes from the bundled open dataset
 *  (i.e. not a populated local SQLite store). */
export function MockBanner() {
  return null;
}
