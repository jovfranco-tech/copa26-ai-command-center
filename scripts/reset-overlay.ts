import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const overlay = {
    scrapedMatches: [],
    playerStats: {},
    results: {},
  };
  const res = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/admin-upload-blob', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-password': process.env.ADMIN_PASSWORD || '',
      'x-temp-secret': '123456789',
      'x-filename': 'live-data.json'
    },
    body: JSON.stringify(overlay)
  });
  console.log('Cleared overlay:', res.status, await res.text());
}

run();
