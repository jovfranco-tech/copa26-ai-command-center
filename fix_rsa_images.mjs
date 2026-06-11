import fs from 'fs';
import { execSync } from 'child_process';

const players = [
  { id: 'RSA-1', name: 'Percy Tau', url: 'https://en.wikipedia.org/wiki/Percy_Tau' },
  { id: 'RSA-2', name: 'Themba Zwane', url: 'https://en.wikipedia.org/wiki/Themba_Zwane' },
  { id: 'RSA-3', name: 'Ronwen Williams', url: 'https://en.wikipedia.org/wiki/Ronwen_Williams' },
  { id: 'RSA-4', name: 'Aubrey Modiba', url: 'https://en.wikipedia.org/wiki/Aubrey_Modiba' },
  { id: 'RSA-5', name: 'Teboho Mokoena', url: 'https://en.wikipedia.org/wiki/Teboho_Mokoena_(soccer)' },
  { id: 'RSA-6', name: 'Mothobi Mvala', url: 'https://en.wikipedia.org/wiki/Mothobi_Mvala' },
  { id: 'RSA-7', name: 'Khuliso Mudau', url: 'https://en.wikipedia.org/wiki/Khuliso_Mudau' },
  { id: 'RSA-8', name: 'Grant Kekana', url: 'https://en.wikipedia.org/wiki/Grant_Kekana' },
  { id: 'RSA-9', name: 'Sphephelo Sithole', url: 'https://en.wikipedia.org/wiki/Sphephelo_Sithole' },
  { id: 'RSA-10', name: 'Elias Mokwana', url: 'https://en.wikipedia.org/wiki/Elias_Mokwana' },
  { id: 'RSA-11', name: 'Evidence Makgopa', url: 'https://en.wikipedia.org/wiki/Evidence_Makgopa' },
];

for (const p of players) {
  try {
    console.log(`Fetching page for ${p.name}...`);
    const html = execSync(`curl -sL -A "Mozilla/5.0" "${p.url}"`, { encoding: 'utf-8' });
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (match && match[1]) {
      const imgUrl = match[1];
      console.log(`Found image URL for ${p.name}: ${imgUrl}`);
      execSync(`curl -sL -A "Mozilla/5.0" -o "apps/web/static/player-photos/${p.id}.jpg" "${imgUrl}"`);
      const fileType = execSync(`file "apps/web/static/player-photos/${p.id}.jpg"`, { encoding: 'utf-8' });
      if (!fileType.includes('image data') && !fileType.includes('JPEG image data')) {
        console.log(`WARNING: Downloaded file for ${p.name} is not a valid image: ${fileType}`);
      } else {
        console.log(`Successfully downloaded ${p.name}`);
      }
    } else {
      console.log(`No og:image found for ${p.name}`);
    }
  } catch (e) {
    console.log(`Error processing ${p.name}: ${e.message}`);
  }
}
execSync('node scripts/generate-player-photo-fallbacks.mjs');
