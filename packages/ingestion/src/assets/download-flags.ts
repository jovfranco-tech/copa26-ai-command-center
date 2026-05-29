/** Download publicly-visible flags into private-assets/flags. Run: pnpm --filter @worldcup/ingestion exec tsx src/assets/download-flags.ts */
import { runAssetJobs } from './asset-runner.js';

runAssetJobs(
  [{ label: 'Flags', assetType: 'flag', entityType: 'team', targetsKey: 'flags' }],
  'Asset download — Flags',
  'asset-download-report.md',
).catch((err) => {
  console.error('[assets:flags] fatal:', err);
  process.exit(1);
});
