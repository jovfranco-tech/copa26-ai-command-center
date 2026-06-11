import { list, put } from '@vercel/blob';

async function clearM001() {
  console.log('Fetching live-overlay.json...');
  const { blobs } = await list({ prefix: 'live-overlay.json', limit: 1 });
  const hit = blobs.find((b) => b.pathname === 'live-overlay.json') ?? blobs[0];
  
  if (!hit) {
    console.log('No live-overlay found.');
    return;
  }

  console.log('Found:', hit.url);
  const res = await fetch(hit.url, { cache: 'no-store' });
  const overlay = await res.json();
  
  if (overlay.results && overlay.results['M001']) {
    console.log('Clearing M001 from overlay...');
    delete overlay.results['M001'];
    
    await put('live-overlay.json', JSON.stringify(overlay), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    console.log('Cleared!');
  } else {
    console.log('M001 not in overlay.');
  }
}

clearM001().catch(console.error);
