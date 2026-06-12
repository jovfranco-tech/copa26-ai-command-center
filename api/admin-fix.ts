import { getOverlay, putOverlay } from './_shared/overlay.js';

export async function GET() {
  const current = await getOverlay();
  if (!current.statsOverrides) current.statsOverrides = {};
  
  // Apply the 3 red cards from the ESPN article (1 for Mexico, 2 for RSA)
  current.statsOverrides['MEX-4'] = { ...current.statsOverrides['MEX-4'], redCards: 1 };
  current.statsOverrides['RSA-2'] = { ...current.statsOverrides['RSA-2'], redCards: 1 };
  current.statsOverrides['RSA-5'] = { ...current.statsOverrides['RSA-5'], redCards: 1 };
  
  await putOverlay(current);
  return Response.json({ ok: true, overlay: current });
}
