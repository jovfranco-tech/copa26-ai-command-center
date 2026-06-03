import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Read squads.ts content and extract SQUADS
const squadsFile = fs.readFileSync(path.join(repoRoot, 'packages', 'shared', 'src', 'data', 'squads.ts'), 'utf8');

// Parse squads.ts line by line
const lines = squadsFile.split('\n');
const cleanLines = lines.map(line => {
  if (line.includes('export type')) {
    return '';
  }
  if (line.includes('export const SQUADS')) {
    return 'const SQUADS = {';
  }
  return line;
});

const cleanSquads = cleanLines.join('\n');

// Execute the JS code to get the squads data structure
const evaluateData = new Function(cleanSquads + '; return SQUADS;');
const SQUADS = evaluateData();

// Read playerPhotos.ts fallbacks
const photosFile = fs.readFileSync(path.join(repoRoot, 'apps', 'web', 'src', 'generated', 'playerPhotos.ts'), 'utf8');

// Extract playerPhotoFallbacks and downloadedPlayerPhotoExts
const downloadedMatch = photosFile.match(/export const downloadedPlayerPhotoExts: Record<string, PlayerPhotoExt> = ({[\s\S]*?});/);
const fallbacksMatch = photosFile.match(/export const playerPhotoFallbacks: Record<string, PlayerPhotoFallback> = ({[\s\S]*?});/);

const downloaded = JSON.parse(downloadedMatch[1]);
const fallbacks = JSON.parse(fallbacksMatch[1]);

let total = 0;
let missingCount = 0;
const missingPlayersList = [];

Object.entries(SQUADS).forEach(([team, players]) => {
  players.forEach((p, idx) => {
    const id = `${team}-${idx + 1}`;
    total++;
    if (!fallbacks[id] && !downloaded[id]) {
      console.log(`Missing photo: ${id} (${p[0]}) in team ${team}`);
      missingCount++;
      missingPlayersList.push({ id, name: p[0], team });
    }
  });
});

console.log(`\nTotal players in SQUADS: ${total}`);
console.log(`Missing photo fallbacks: ${missingCount}`);
fs.writeFileSync(path.join(repoRoot, 'scripts', 'missing-report.json'), JSON.stringify(missingPlayersList, null, 2));
