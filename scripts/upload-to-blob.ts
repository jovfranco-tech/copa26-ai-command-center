import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'private-assets', 'players');
const dataFile = join(repoRoot, 'packages', 'shared', 'src', 'data', 'blobPlayerPhotos.json');

const ENDPOINT = 'https://copa26-command-center.vercel.app/api/admin-upload-blob';
const TEMP_SECRET = '123456789';

async function main() {
  if (!existsSync(sourceDir)) {
    console.error('Source directory does not exist');
    process.exit(1);
  }

  const files = readdirSync(sourceDir).filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()));
  
  let existingMap: Record<string, string> = {};
  if (existsSync(dataFile)) {
    existingMap = JSON.parse(readFileSync(dataFile, 'utf-8'));
  }

  console.log(`Found ${files.length} images. Uploading new ones to Vercel Blob...`);

  let uploaded = 0;
  for (const file of files) {
    const id = basename(file, extname(file));
    if (existingMap[id]) continue; // Skip already uploaded

    const filepath = join(sourceDir, file);
    const buffer = readFileSync(filepath);

    console.log(`Uploading ${id}...`);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'x-temp-secret': TEMP_SECRET,
          'x-filename': file,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });

      const data = await res.json();
      if (data.ok) {
        existingMap[id] = data.url;
        uploaded++;
        // Save incrementally so we don't lose progress if it crashes
        writeFileSync(dataFile, JSON.stringify(existingMap, null, 2));
      } else {
        console.error(`Failed to upload ${id}:`, data.error);
      }
    } catch (err) {
      console.error(`Network error uploading ${id}:`, err);
    }
  }

  console.log(`Done! Uploaded ${uploaded} new photos.`);
}

main().catch(console.error);
