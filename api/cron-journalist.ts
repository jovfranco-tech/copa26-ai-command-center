import { getOverlay, putOverlay } from './_shared/overlay.js';
import { scrapeCardsForMatch } from './_shared/gemini-news-scraper.js';
import { MATCHES } from '../packages/shared/src/dataset/index.js';

export const maxDuration = 60; // 60 seconds max duration

export async function GET(request: Request) {
  // Optional auth to prevent manual abuse if someone guesses the URL
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[cron-journalist] Falló la autenticación del cron');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY' }), { status: 500 });
  }

  if (process.env.ENABLE_JOURNALIST_CRON !== 'true') {
    return new Response(JSON.stringify({ status: 'skipped', reason: 'ENABLE_JOURNALIST_CRON is not true' }), { status: 200 });
  }

  const overlay = await getOverlay();
  overlay.playerStats = overlay.playerStats || {};
  overlay.results = overlay.results || {};
  overlay.scrapedMatches = overlay.scrapedMatches || [];

  let updated = false;

  // We only scrape ONE match per cron execution to avoid hitting Vercel's 60s timeout
  // and Gemini rate limits.
  for (const match of MATCHES) {
    // Only scrape if the match has finished. We assume if time has passed, it's finished.
    // simulate-live.ts handles setting FT.
    const result = overlay.results[match.id];
    
    // Check if it's FT and not scraped yet
    if (result && result.status === 'FT' && !overlay.scrapedMatches.includes(match.id)) {
      console.log(`[cron-journalist] Investigando partido finalizado ${match.home} vs ${match.away}...`);
      
      try {
        const cards = await scrapeCardsForMatch(match.home, match.away, geminiKey);
        if (cards) {
          console.log(` -> ¡Datos encontrados! Goles: ${cards.homeGoals}-${cards.awayGoals}`);
          
          if (cards.homeGoals !== null && cards.awayGoals !== null) {
            overlay.results[match.id].homeGoals = cards.homeGoals;
            overlay.results[match.id].awayGoals = cards.awayGoals;
            overlay.results[match.id].source = 'gemini-autonomous';
          }
          
          overlay.scrapedMatches.push(match.id);
          
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
          
          updated = true;
          break; // Stop after processing ONE match to guarantee we don't timeout
        } else {
          console.log(` -> No se encontraron datos para ${match.id}`);
          // Do not add to scrapedMatches so it tries again later?
          // Or add it to prevent infinite retries? Let's add it to prevent looping if no article exists.
          overlay.scrapedMatches.push(match.id); 
          updated = true;
          break;
        }
      } catch (err: any) {
        console.error(`[cron-journalist] Error procesando ${match.id}:`, err.message);
        break; // Stop on error
      }
    }
  }

  if (updated) {
    await putOverlay(overlay);
    return new Response(JSON.stringify({ ok: true, message: 'Processed one match' }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true, message: 'No matches needed scraping' }), { status: 200 });
}
