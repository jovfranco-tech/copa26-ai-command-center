/**
 * GET /api/simulate-live — scheduled auto-simulation of live World Cup scores.
 *
 * A Vercel cron hits this on a schedule; it strictly reads the static match schedule,
 * checks the current clock, and artificially forces matches to 'LIVE' or 'FT' status 
 * in the Vercel Blob overlay. This is a simulation engine for demonstrating the dashboard
 * without real API data.
 */
import { blobConfigured, getOverlay, putOverlay } from './_shared/overlay.js';
import type { ResultEntry } from '../packages/shared/src/liveOverlay.js';
import wcData from '../packages/shared/src/data/worldcup2026.json' with { type: 'json' };

export async function GET(): Promise<Response> {
  if (!blobConfigured()) {
    return Response.json({ ok: false, error: 'blob-not-configured' }, { status: 503 });
  }

  const overlay = await getOverlay();
  const nextResults: Record<string, ResultEntry> = { ...overlay.results };
  let written = 0;
  const now = Date.now();

  for (const match of wcData.matches) {
    if (!match.date || !match.time) continue;

    const kickoffTime = Date.parse(`${match.date}T${match.time}:00-06:00`); // CDMX timezone offset
    if (Number.isNaN(kickoffTime)) continue;

    const diffMs = now - kickoffTime;
    const diffMinutes = Math.floor(diffMs / 60000);

    const existing = overlay.results[match.id];
    if (existing?.source === 'manual') continue; // never overwrite a manual entry

    if (diffMinutes >= 0 && diffMinutes <= 115) {
      // Match is LIVE
      let displayMinute = diffMinutes;
      if (displayMinute > 45 && displayMinute < 60) displayMinute = 45; // halftime pause
      if (displayMinute >= 60) displayMinute -= 15; // second half
      if (displayMinute > 90) displayMinute = 90; // extra time

      // Random goal simulation (approx 2.5 goals per match over 90 mins -> ~0.013 chance per team per minute)
      // Only roll for goals if the minute changed and it's not halftime
      const isNewMinute = !existing || existing.minute !== displayMinute;
      const isHalftime = diffMinutes > 45 && diffMinutes < 60;
      
      let homeG = existing?.homeGoals ?? 0;
      let awayG = existing?.awayGoals ?? 0;

      if (isNewMinute && !isHalftime) {
        if (Math.random() < 0.015) homeG += 1;
        if (Math.random() < 0.012) awayG += 1; // Slight home advantage
      }

      const newResult: ResultEntry = {
        homeGoals: homeG,
        awayGoals: awayG,
        status: 'LIVE',
        minute: displayMinute,
        source: 'auto'
      };

      if (!existing || existing.status !== newResult.status || existing.minute !== newResult.minute) {
        nextResults[match.id] = newResult;
        written++;
      }
    } else if (diffMinutes > 115) {
      // Match is Finished
      if (!existing || existing.status !== 'FT') {
        nextResults[match.id] = {
          homeGoals: existing?.homeGoals ?? 0,
          awayGoals: existing?.awayGoals ?? 0,
          status: 'FT',
          minute: 90,
          source: 'auto'
        };
        written++;
      }
    }
  }

  if (written > 0) {
    await putOverlay({ ...overlay, results: nextResults, updatedAt: new Date().toISOString() });
  }

  return Response.json({
    ok: true,
    simulated: true,
    written
  });
}
