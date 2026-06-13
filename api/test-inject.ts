import { getOverlay, putOverlay } from './_shared/overlay.js';

export async function POST() {
  const overlay = await getOverlay();
  overlay.playerStats = overlay.playerStats || {};
  overlay.results = overlay.results || {};
  overlay.scrapedMatches = overlay.scrapedMatches || [];

  const matchId = 'm001';
  
  overlay.results[matchId] = {
    homeGoals: 2,
    awayGoals: 0,
    status: 'FT',
    minute: 90,
    source: 'gemini-autonomous'
  };

  overlay.scrapedMatches.push(matchId);

  // Hardcode the IDs we found earlier
  overlay.playerStats['MEX-5'] = { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 };
  overlay.playerStats['RSA-17'] = { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 };
  overlay.playerStats['RSA-23'] = { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 };
  overlay.playerStats['MEX-6'] = { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 };
  overlay.playerStats['RSA-1'] = { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 };
  overlay.playerStats['MEX-3'] = { goals: 0, assists: 0, yellow: 0, red: 0, saves: 2 };
  overlay.playerStats['MEX-24'] = { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 };
  overlay.playerStats['MEX-20'] = { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 };

  await putOverlay(overlay);
  return Response.json({ success: true });
}
