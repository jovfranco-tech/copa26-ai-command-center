import fs from 'fs';
import path from 'path';
import { SQUADS } from './packages/shared/src/data/squads';

let missingRatings = 0;
let totalPlayers = 0;
let brokenImages = 0;
let missingImages = 0;

const ratingsCode = fs.readFileSync('apps/web/src/generated/playerRatings.ts', 'utf8');
const photosDir = 'apps/web/static/player-photos';

for (const [teamCode, players] of Object.entries(SQUADS)) {
  players.forEach((p, idx) => {
    totalPlayers++;
    const id = `${teamCode}-${idx + 1}`;
    
    if (!ratingsCode.includes(`"${id}": {`)) {
      missingRatings++;
    }
    
    const extensions = ['.jpg', '.webp', '.png'];
    let foundImg = false;
    let isBroken = false;
    for (const ext of extensions) {
      const pth = path.join(photosDir, `${id}${ext}`);
      if (fs.existsSync(pth)) {
        foundImg = true;
        const buffer = Buffer.alloc(10);
        const fd = fs.openSync(pth, 'r');
        fs.readSync(fd, buffer, 0, 10, 0);
        fs.closeSync(fd);
        if (buffer.toString().startsWith('<!DOCTYPE') || buffer.toString().startsWith('<html')) {
          isBroken = true;
        }
        break;
      }
    }
    
    if (!foundImg) missingImages++;
    if (isBroken) brokenImages++;
  });
}

console.log(`Total Players: ${totalPlayers}`);
console.log(`Missing Ratings (ESTIMADO): ${missingRatings}`);
console.log(`Missing Images (No file): ${missingImages}`);
console.log(`Broken Images (HTML error files): ${brokenImages}`);
