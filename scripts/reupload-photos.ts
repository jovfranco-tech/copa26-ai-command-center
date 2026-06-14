import { readdirSync, readFileSync } from 'node:fs';
import { join, extname, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const photosDir = join(repoRoot, 'private-assets', 'players');

async function uploadPhoto(id: string, filePath: string) {
  const fileData = readFileSync(filePath);
  const ext = extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
  
  const res = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/admin-upload-blob', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'x-temp-secret': '123456789',
      'x-filename': `players/${id}.jpg`
    },
    body: fileData
  });
  const json = await res.json();
  console.log(`${id}: ${res.status} ${json.ok ? '✅' : '❌'} ${json.url || json.error || ''}`);
}

async function main() {
  const files = readdirSync(photosDir);
  let count = 0;
  
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    const id = basename(file, ext);
    const filePath = join(photosDir, file);
    
    await uploadPhoto(id, filePath);
    count++;
    
    // Small delay to avoid rate limiting
    if (count % 20 === 0) {
      console.log(`--- Uploaded ${count} photos ---`);
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log(`\nDone! Uploaded ${count} photos.`);
}

main().catch(console.error);
