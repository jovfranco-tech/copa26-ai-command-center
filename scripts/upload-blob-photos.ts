import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API_URL = 'https://copa26-command-center.vercel.app/api/admin-blob-upload';
const SECRET = 'Bearer temp-admin-upload-secret';
const ASSETS_DIR = join(process.cwd(), 'private-assets', 'players');
const OUTPUT_JSON = join(process.cwd(), 'packages', 'shared', 'src', 'data', 'blobPlayerPhotos.json');

async function main() {
  const files = readdirSync(ASSETS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));
  const results: Record<string, string> = {};

  console.log(`Found ${files.length} photos. Uploading...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const playerId = file.replace(/\.[^/.]+$/, ""); // strip extension
    const path = join(ASSETS_DIR, file);
    const buffer = readFileSync(path);

    try {
      console.log(`[${i+1}/${files.length}] Uploading ${file}...`);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'authorization': SECRET,
          'x-filename': file,
        },
        body: buffer,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as { url: string };
      results[playerId] = data.url;
      console.log(` -> ${data.url}`);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
    
    // small delay to prevent overwhelming the serverless function
    await new Promise(r => setTimeout(r, 200));
  }

  writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nFinished! Wrote ${Object.keys(results).length} URLs to ${OUTPUT_JSON}`);
}

main().catch(console.error);
