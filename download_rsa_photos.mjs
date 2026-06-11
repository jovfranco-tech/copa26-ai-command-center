import fs from 'fs';
import https from 'https';

const players = [
  { id: 'RSA-5', name: 'Teboho Mokoena', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Teboho_Mokoena_%28cropped%29.jpg/220px-Teboho_Mokoena_%28cropped%29.jpg' },
  { id: 'RSA-7', name: 'Khuliso Mudau', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Khuliso_Mudau.jpg/220px-Khuliso_Mudau.jpg' },
  { id: 'RSA-9', name: 'Sphephelo Sithole', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Sphephelo_Sithole_%28cropped%29.jpg/220px-Sphephelo_Sithole_%28cropped%29.jpg' },
  { id: 'RSA-10', name: 'Elias Mokwana', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Elias_Mokwana.jpg/220px-Elias_Mokwana.jpg' },
  { id: 'RSA-11', name: 'Evidence Makgopa', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Evidence_Makgopa_%28cropped%29.jpg/220px-Evidence_Makgopa_%28cropped%29.jpg' }
];

const fallbackUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Anonymous_emblem.svg/200px-Anonymous_emblem.svg.png';

for (const p of players) {
  const file = fs.createWriteStream(`apps/web/public/player-photos/${p.id}.jpg`);
  https.get(p.url, (res) => {
    if (res.statusCode === 200) {
      res.pipe(file);
    } else {
      console.log(`Failed for ${p.name}, using fallback`);
      https.get(fallbackUrl, (res2) => res2.pipe(file));
    }
  }).on('error', () => {
    https.get(fallbackUrl, (res2) => res2.pipe(file));
  });
}
console.log('Download initiated');
