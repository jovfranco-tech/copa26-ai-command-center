/** Download publicly-visible official player photos into private-assets/players. */
import { runAssetJobs } from './asset-runner.js';

runAssetJobs(
  [{ label: 'Player photos', assetType: 'photo', entityType: 'player', targetsKey: 'playerPhotos' }],
  'Asset download — Player photos',
  'asset-download-report.md',
).catch((err) => {
  console.error('[assets:players] fatal:', err);
  process.exit(1);
});
