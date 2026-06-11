import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SQUADS } from './packages/shared/src/data/squads.ts';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(__filename);
const photosCacheFile = path.join(repoRoot, 'scraped-cache', 'json', 'player-photo-resolutions.json');

const nameToId = new Map<string, string>();
for (const [team, players] of Object.entries(SQUADS)) {
  players.forEach((player, index) => {
    nameToId.set(player[0], `${team}-${index + 1}`);
  });
}

if (fs.existsSync(photosCacheFile)) {
  const photos = JSON.parse(fs.readFileSync(photosCacheFile, 'utf8'));
  for (const item of photos) {
    if (item.name && nameToId.has(item.name)) {
      item.playerId = nameToId.get(item.name)!;
    }
  }
  fs.writeFileSync(photosCacheFile, JSON.stringify(photos, null, 2));
  console.log('Fixed photos cache IDs based on .name');
}
