import { execSync } from 'child_process';

const players = [
  { id: 'RSA-1', title: 'Percy_Tau' },
  { id: 'RSA-2', title: 'Themba_Zwane' },
  { id: 'RSA-3', title: 'Ronwen_Williams' },
  { id: 'RSA-4', title: 'Aubrey_Modiba' },
  { id: 'RSA-5', title: 'Teboho_Mokoena_(soccer)' },
  { id: 'RSA-6', title: 'Mothobi_Mvala' },
  { id: 'RSA-7', title: 'Khuliso_Mudau' },
  { id: 'RSA-8', title: 'Grant_Kekana' },
  { id: 'RSA-9', title: 'Sphephelo_Sithole' },
  { id: 'RSA-10', title: 'Elias_Mokwana' },
  { id: 'RSA-11', title: 'Evidence_Makgopa' }
];

for (const p of players) {
  try {
    const jsonStr = execSync(`curl -sL -A "Mozilla/5.0" "https://en.wikipedia.org/api/rest_v1/page/summary/${p.title}"`, { encoding: 'utf-8' });
    const data = JSON.parse(jsonStr);
    
    // Some players might not have an image on Wikipedia, use generic silhouette
    let imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';
    
    if (data.thumbnail && data.thumbnail.source) {
      imgUrl = data.thumbnail.source;
      // Change thumbnail size to get better quality (e.g., 320px)
      imgUrl = imgUrl.replace(/\/\d+px-/, '/320px-');
    } else {
      console.log(`No thumbnail for ${p.title}, using generic.`);
    }
    
    execSync(`curl -sL -A "Mozilla/5.0" -o "apps/web/static/player-photos/${p.id}.jpg" "${imgUrl}"`);
    console.log(`Downloaded ${p.id}`);
  } catch (e) {
    console.log(`Error on ${p.title}:`, e.message);
  }
}
execSync('node scripts/generate-player-photo-fallbacks.mjs');
