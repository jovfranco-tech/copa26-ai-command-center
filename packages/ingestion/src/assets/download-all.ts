/** Download all configured asset types in one pass. Run: pnpm ingest:assets */
import { runAssetJobs } from './asset-runner.js';

runAssetJobs(
  [
    { label: 'Flags', assetType: 'flag', entityType: 'team', targetsKey: 'flags' },
    { label: 'Team crests', assetType: 'crest', entityType: 'team', targetsKey: 'crests' },
    { label: 'Player photos', assetType: 'photo', entityType: 'player', targetsKey: 'playerPhotos' },
    { label: 'Venue images', assetType: 'venue_image', entityType: 'venue', targetsKey: 'venueImages' },
  ],
  'Asset download — all types',
  'asset-download-report.md',
).catch((err) => {
  console.error('[assets:all] fatal:', err);
  process.exit(1);
});
