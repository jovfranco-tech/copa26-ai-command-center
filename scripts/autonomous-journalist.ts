import { config } from 'dotenv';
config({ path: '.env.local' });
import { scrapeCardsForMatch } from '../api/_shared/gemini-news-scraper.js';
import { MATCHES } from '../packages/shared/src/dataset/index.js';

const CURRENT_DATE = '2026-06-12';

async function runDaemon() {
  console.log('[autonomous-journalist] Despertando...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('[autonomous-journalist] Falta GEMINI_API_KEY en el entorno.');
    return;
  }
  
  // First, fetch the current state
  let overlay: any = null;
  try {
    const res = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/live-data');
    if (res.ok) {
      overlay = await res.json();
    }
  } catch (err) {
    console.error('No se pudo obtener el estado actual:', err);
    return;
  }

  if (!overlay) return;

  overlay.playerStats = overlay.playerStats || {};
  overlay.results = overlay.results || {};
  overlay.scrapedMatches = overlay.scrapedMatches || [];

  let updated = false;

  for (const match of MATCHES) {
    if (match.date <= CURRENT_DATE) {
      const alreadyScraped = overlay.scrapedMatches.includes(match.id);
      const hasAdvancedFields = !!overlay.results[match.id]?.chronicle;
      
      if (!alreadyScraped || !hasAdvancedFields) {
        console.log(`[autonomous-journalist] Investigando partido ${match.home} vs ${match.away} (${match.date})...`);
        
        try {
          const cards = await scrapeCardsForMatch(match.home, match.away, process.env.GEMINI_API_KEY);
          if (cards) {
            console.log(` -> ¡Datos encontrados! Goles: ${cards.homeGoals}-${cards.awayGoals}`);
            
            if (cards.homeGoals !== null && cards.awayGoals !== null) {
              overlay.results[match.id] = {
                homeGoals: cards.homeGoals,
                awayGoals: cards.awayGoals,
                status: 'FT',
                minute: 90,
                source: 'gemini-autonomous',
                // Advanced AI fields
                ...(cards.chronicle ? { chronicle: cards.chronicle } : {}),
                ...(cards.mvp ? { mvp: cards.mvp } : {}),
                ...(cards.teamStats ? { teamStats: cards.teamStats } : {}),
                ...(cards.injuries && cards.injuries.length > 0 ? { injuries: cards.injuries } : {}),
                ...(cards.formations ? { formations: cards.formations } : {}),
                ...(cards.timeline && cards.timeline.length > 0 ? { timeline: cards.timeline } : {})
              };
            }
            
            if (!alreadyScraped) {
              overlay.scrapedMatches.push(match.id);
            }
            
            let statsAdded = 0;
            const processStat = (pid: string, type: 'yellow' | 'red' | 'saves' | 'assists' | 'goals', increment: number) => {
              overlay.playerStats![pid] = overlay.playerStats![pid] || { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
              overlay.playerStats![pid][type] = (overlay.playerStats![pid][type] || 0) + increment;
              statsAdded += increment;
            };

            cards.yellowCards.forEach(id => processStat(id, 'yellow', 1));
            cards.redCards.forEach(id => processStat(id, 'red', 1));
            cards.assists.forEach(a => processStat(a.id, 'assists', a.count));
            cards.saves.forEach(s => processStat(s.id, 'saves', s.count));
            
            console.log(` -> Eventos extraídos: ${statsAdded}`);
            updated = true;
          } else {
            console.log(` -> No se encontraron datos concluyentes todavía.`);
          }
        } catch (err: any) {
          console.error(`[autonomous-journalist] Error procesando ${match.id}:`, err.message);
        }
        
        // Wait 5 seconds between matches
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  if (updated) {
    console.log('[autonomous-journalist] Guardando reportes en producción...');
    try {
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
      if (res.ok) {
        console.log('[autonomous-journalist] Overlay actualizado con éxito.');
      } else {
        console.error('[autonomous-journalist] Error al guardar overlay:', await res.text());
      }
    } catch (err) {
      console.error('[autonomous-journalist] Falla de red al guardar:', err);
    }
  } else {
    console.log('[autonomous-journalist] No hay partidos nuevos por investigar.');
  }
}

async function daemon() {
  while (true) {
    await runDaemon();
    console.log('[autonomous-journalist] Durmiendo por 1 minuto...');
    await new Promise(r => setTimeout(r, 60000));
  }
}

daemon().catch(console.error);
