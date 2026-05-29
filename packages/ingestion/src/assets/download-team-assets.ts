/** Download publicly-visible team crests/logos into private-assets/crests. */
import { runAssetJobs } from './asset-runner.js';

runAssetJobs(
  [{ label: 'Team crests', assetType: 'crest', entityType: 'team', targetsKey: 'crests' }],
  'Asset download — Team crests',
  'asset-download-report.md',
).catch((err) => {
  console.error('[assets:team] fatal:', err);
  process.exit(1);
});
