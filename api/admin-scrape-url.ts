import { getOverlay, putOverlay } from './_shared/overlay.js';
import { scrapeCardsFromUrl, scrapeCardsForMatch } from './_shared/gemini-news-scraper.js';
import { MATCHES } from '../packages/shared/src/dataset/index.js';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const adminPw = process.env.ADMIN_PASSWORD;
    const auth = request.headers.get('x-admin-password');
    if (!adminPw || auth !== adminPw) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { matchId, url } = await request.json();
    if (!matchId) {
      return new Response(JSON.stringify({ error: 'Missing matchId' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const matchDef = MATCHES.find(m => m.id === matchId);
    if (!matchDef) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    console.log(`[admin-scrape-url] Scraping ${matchId}... url: ${url || 'autonomous'}`);
    const cards = url 
      ? await scrapeCardsFromUrl(matchDef.home, matchDef.away, url, geminiKey)
      : await scrapeCardsForMatch(matchDef.home, matchDef.away, geminiKey);

    if (!cards) {
      return new Response(JSON.stringify({ error: 'Failed to extract data or no data found' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Apply to overlay
    const overlay = await getOverlay();
    overlay.playerStats = overlay.playerStats || {};
    
    // Track stats added
    let statsAdded = 0;

    const processStat = (pid: string, type: 'yellow' | 'red' | 'saves' | 'assists', increment: number) => {
      overlay.playerStats![pid] = overlay.playerStats![pid] || { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
      overlay.playerStats![pid][type] = (overlay.playerStats![pid][type] || 0) + increment;
      statsAdded += increment;
    };

    cards.yellowCards.forEach(id => processStat(id, 'yellow', 1));
    cards.redCards.forEach(id => processStat(id, 'red', 1));
    cards.assists.forEach(a => processStat(a.id, 'assists', a.count));
    cards.saves.forEach(s => processStat(s.id, 'saves', s.count));

    if (statsAdded > 0) {
      await putOverlay(overlay);
    }

    return new Response(JSON.stringify({ success: true, cards, statsAdded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  } catch (err: any) {
    console.error('admin-scrape-url error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
