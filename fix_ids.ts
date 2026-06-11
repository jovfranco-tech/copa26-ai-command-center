import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SQUADS } from './packages/shared/src/data/squads.ts';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(__filename);
const ratingsCacheFile = path.join(repoRoot, 'scraped-cache', 'json', 'player-fc26-ratings.json');
const photosCacheFile = path.join(repoRoot, 'scraped-cache', 'json', 'player-photo-resolutions.json');
const photosDir = path.join(repoRoot, 'apps', 'web', 'static', 'player-photos');

// Build maps
const nameToId = new Map<string, string>();
for (const [team, players] of Object.entries(SQUADS)) {
  players.forEach((player, index) => {
    nameToId.set(player[0], `${team}-${index + 1}`);
  });
}

// 1. Fix ratings cache
const oldIdToNewId = new Map<string, string>();

if (fs.existsSync(ratingsCacheFile)) {
  const ratings = JSON.parse(fs.readFileSync(ratingsCacheFile, 'utf8'));
  for (const item of ratings) {
    if (nameToId.has(item.name)) {
      const newId = nameToId.get(item.name)!;
      if (item.id !== newId) {
        oldIdToNewId.set(item.id, newId);
        item.id = newId;
      }
    }
  }
  fs.writeFileSync(ratingsCacheFile, JSON.stringify(ratings, null, 2));
  console.log('Fixed ratings cache IDs');
}

// 2. Fix photos cache (it has playerId and playerName)
if (fs.existsSync(photosCacheFile)) {
  const photos = JSON.parse(fs.readFileSync(photosCacheFile, 'utf8'));
  for (const item of photos) {
    if (item.playerName && nameToId.has(item.playerName)) {
      item.playerId = nameToId.get(item.playerName)!;
    } else if (oldIdToNewId.has(item.playerId)) {
      item.playerId = oldIdToNewId.get(item.playerId)!;
    }
  }
  fs.writeFileSync(photosCacheFile, JSON.stringify(photos, null, 2));
  console.log('Fixed photos cache IDs');
}

// 3. Rename files in player-photos directory
if (fs.existsSync(photosDir)) {
  const files = fs.readdirSync(photosDir);
  const renames: {old: string, new: string}[] = [];
  
  // Create a backup of the renames to avoid conflicts during renaming (e.g. ARG-1 -> temp -> ARG-22)
  for (const file of files) {
    const ext = path.extname(file);
    const oldId = path.basename(file, ext);
    if (oldIdToNewId.has(oldId)) {
      const newId = oldIdToNewId.get(oldId)!;
      renames.push({
        old: path.join(photosDir, file),
        new: path.join(photosDir, newId + ext)
      });
    }
  }
  
  // Rename everything to a temp suffix first to avoid overwriting each other
  renames.forEach(r => fs.renameSync(r.old, r.old + '.tmp_rename'));
  // Then to the final name
  renames.forEach(r => fs.renameSync(r.old + '.tmp_rename', r.new));
  
  console.log(`Renamed ${renames.length} photo files`);
}
