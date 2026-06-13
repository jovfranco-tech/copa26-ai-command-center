import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import google from 'googlethis';
import { PLAYERS, teamByCode } from '../../../shared/src/dataset/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, '../../../../private-assets/players');
const REPORT_PATH = path.join(__dirname, '../../../../reports/fallback-photo-download-report.md');

// Ensure directory exists
fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    // Only accept jpg/png URLs to avoid WEBP/SVG/weird formats that might break image components
    if (!url.toLowerCase().match(/\.(jpe?g|png)(\?.*)?$/)) {
      return false;
    }
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://google.com/'
      },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    
    if (!res.ok) return false;
    
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 10000) {
      // Less than 10KB is probably a tracking pixel or icon, skip it
      return false;
    }
    
    fs.writeFileSync(dest, Buffer.from(buffer));
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log('[fallback-scraper] Starting fallback download process via Google Images...');
  
  const existingFiles = new Set(fs.readdirSync(ASSETS_DIR).map(f => f.split('.')[0]));
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  // Create report stream
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const report = fs.createWriteStream(REPORT_PATH);
  report.write('# Google Images Fallback Scraper Report\n\n');
  
  for (const player of PLAYERS) {
    if (existingFiles.has(player.id)) {
      skipped++;
      continue;
    }
    
    const teamName = teamByCode[player.team]?.name || player.team;
    const query = `${player.name} ${teamName} football player portrait`;
    
    console.log(`[fallback-scraper] Searching: ${query}`);
    
    try {
      const results = await google.image(query, { safe: true });
      
      let success = false;
      // Try the first 3 results
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const imageUrl = results[i].url;
        if (imageUrl) {
          const dest = path.join(ASSETS_DIR, `${player.id}.jpg`); // force jpg ext
          const dl = await downloadImage(imageUrl, dest);
          if (dl) {
            console.log(`  -> Downloaded ${imageUrl}`);
            report.write(`- ✅ **${player.name}** (${player.id}): [Image URL](${imageUrl})\n`);
            downloaded++;
            success = true;
            break;
          }
        }
      }
      
      if (!success) {
        console.log(`  -> Failed to find valid image for ${player.id}`);
        report.write(`- ❌ **${player.name}** (${player.id}): No valid image found\n`);
        failed++;
      }
      
    } catch (err: any) {
      console.error(`  -> Error scraping ${player.id}: ${err.message}`);
      failed++;
    }
    
    // Polite delay to avoid Google rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n[fallback-scraper] Done! Downloaded: ${downloaded}, Skipped (already existed): ${skipped}, Failed: ${failed}`);
  report.end(`\n**Summary:**\n- Downloaded: ${downloaded}\n- Skipped: ${skipped}\n- Failed: ${failed}\n`);
}

run().catch(console.error);
