import { scrapeCardsForMatch } from './api/_shared/gemini-news-scraper';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Testing scraper for MEX vs KOR...');
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('No GEMINI_API_KEY in .env');
    return;
  }
  const result = await scrapeCardsForMatch('MEX', 'KOR', key);
  console.log('Scraper result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
