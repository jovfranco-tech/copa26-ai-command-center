import { getOverlay, putOverlay } from './_shared/overlay.js';

export async function GET() {
  const current = await getOverlay();
  if (!current.playerStats) current.playerStats = {};
  
  // Apply the 3 red cards from the ESPN article (1 for Mexico, 2 for RSA)
  current.playerStats['MEX-4'] = { ...current.playerStats['MEX-4'], goals: 0, assists: 0, yellow: 0, saves: 0, red: 1 };
  current.playerStats['RSA-2'] = { ...current.playerStats['RSA-2'], goals: 0, assists: 0, yellow: 0, saves: 0, red: 1 };
  current.playerStats['RSA-5'] = { ...current.playerStats['RSA-5'], goals: 0, assists: 0, yellow: 0, saves: 0, red: 1 };
  
  await putOverlay(current);
  return Response.json({ ok: true, overlay: current });
}
