import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeCardsForMatch } from '../api/_shared/gemini-news-scraper.js';
import { MATCHES } from '../packages/shared/src/dataset/index.js';

async function run() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('Falta GEMINI_API_KEY en .env.local');
    return;
  }

  const matchDef = MATCHES[0];
  if (!matchDef) {
    console.error('No matches found in dataset');
    return;
  }
  const matchId = matchDef.id;

  console.log(`[test-scraper] Iniciando Periodista Autónomo para ${matchDef.home} vs ${matchDef.away} (Simulación)...`);
  
  try {
    const data = await scrapeCardsForMatch(matchDef.home, matchDef.away, geminiKey);
    console.log('\n--- RESULTADO OBTENIDO ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--------------------------\n');
    console.log('¡Extracción completada exitosamente!');
  } catch (error) {
    console.error('Error durante la extracción:', error);
  }
}

run().catch(console.error);
