import { put } from '@vercel/blob';

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('No token');
  
  const res = await fetch('https://copa26-command-center.vercel.app/api/live-data');
  const overlay = await res.json();
  
  overlay.scrapedMatches = [];
  
  await put('liveOverlay.json', JSON.stringify(overlay), {
    access: 'public',
    addRandomSuffix: false,
    token
  });
  console.log('Cleared scrapedMatches!');
}

main().catch(console.error);
