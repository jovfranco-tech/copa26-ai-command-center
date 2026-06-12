import { scrapeCardsForMatch } from './_shared/gemini-news-scraper.js';

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = url.searchParams.get('home') || 'MEX';
  const away = url.searchParams.get('away') || 'RSA';
  
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: 'No GEMINI_API_KEY' }, { status: 500 });
  }

  try {
    const cards = await scrapeCardsForMatch(home, away, process.env.GEMINI_API_KEY);
    return Response.json({ home, away, cards });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
