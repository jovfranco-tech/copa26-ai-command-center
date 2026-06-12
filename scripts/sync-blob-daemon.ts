import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API_URL = 'https://copa26-command-center.vercel.app/api/admin-blob-upload';
const SECRET = 'Bearer temp-admin-upload-secret';
const ASSETS_DIR = join(process.cwd(), 'private-assets', 'players');
const OUTPUT_JSON = join(process.cwd(), 'packages', 'shared', 'src', 'data', 'blobPlayerPhotos.json');

async function sync() {
  if (!existsSync(ASSETS_DIR)) return;
  const files = readdirSync(ASSETS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));
  
  let currentUrls: Record<string, string> = {};
  if (existsSync(OUTPUT_JSON)) {
    try {
      currentUrls = JSON.parse(readFileSync(OUTPUT_JSON, 'utf-8'));
    } catch {}
  }

  let updated = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const playerId = file.replace(/\.[^/.]+$/, "");
    if (currentUrls[playerId]) continue; // already uploaded

    const path = join(ASSETS_DIR, file);
    const buffer = readFileSync(path);

    try {
      console.log(`Uploading new photo for ${playerId}...`);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'authorization': SECRET,
          'x-filename': `${playerId}.jpg`,
        },
        body: buffer,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { url: string };
      currentUrls[playerId] = data.url;
      updated = true;
      console.log(` -> ${data.url}`);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }

  if (updated) {
    writeFileSync(OUTPUT_JSON, JSON.stringify(currentUrls, null, 2), 'utf-8');
    console.log(`Updated blobPlayerPhotos.json`);
  }
  setTimeout(sync, 10000);
}

console.log("Blob sync daemon started. Watching for new photos...");
sync();
