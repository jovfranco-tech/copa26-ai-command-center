import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_KEY = process.env.FOOTBALL_DATA_TOKEN;
if (!API_KEY) {
  console.error("Missing FOOTBALL_DATA_TOKEN");
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../private-assets/players');
fs.mkdirSync(dir, { recursive: true });

async function fetchPage(page) {
  const res = await fetch(`https://v3.football.api-sports.io/players?league=15&season=2026&page=${page}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function downloadImage(url, filename) {
  if (!url) return;
  const res = await fetch(url);
  if (!res.ok) return;
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path.join(dir, filename), Buffer.from(buffer));
  console.log(`Downloaded ${filename}`);
}

// Simple heuristic: we just download the photos and name them using the API-Sports ID for now.
// Wait, the UI expects KOR-11.png. How do we map it?
// Let's just download the API-Sports ID photos and then I can write a matcher if needed.
// Actually, let's just write a matcher here using PLAYERS dataset.
import { PLAYERS } from '../packages/shared/src/dataset/index.js';

const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function findMatchedPlayer(apiPlayer) {
  const normApiName = normalize(apiPlayer.name);
  const normApiLast = normalize(apiPlayer.lastname);
  
  for (const p of PLAYERS) {
    const normPName = normalize(p.name);
    // If exact name match, or lastname match
    if (normPName === normApiName || normPName.includes(normApiLast) || normApiName.includes(normPName)) {
      return p;
    }
  }
  return null;
}

async function run() {
  console.log("Starting photo download...");
  let page = 1;
  let totalPages = 1;
  
  while (page <= totalPages) {
    console.log(`Fetching page ${page}/${totalPages}...`);
    const data = await fetchPage(page);
    if (data.paging) {
      totalPages = data.paging.total;
    }
    
    for (const item of data.response) {
      const p = item.player;
      const matched = findMatchedPlayer(p);
      if (matched && p.photo) {
        await downloadImage(p.photo, `${matched.id}.png`);
      } else if (p.photo) {
        // Fallback: save by api ID, maybe we can map later
        await downloadImage(p.photo, `api_${p.id}.png`);
      }
    }
    page++;
    // Sleep to respect API rate limits (10 req/sec)
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("Done!");
}

run().catch(console.error);
