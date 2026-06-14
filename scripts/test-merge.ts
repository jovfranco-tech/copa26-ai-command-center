import { mock } from '../packages/shared/src/index.js';

function findId(team: string, nameFragment: string) {
  const p = mock.PLAYERS.find(p => p.team === team && p.name.toLowerCase().includes(nameFragment.toLowerCase()));
  if (!p) throw new Error(`Player not found: ${team} - ${nameFragment}`);
  return p.id;
}

async function run() {
  const existingRes = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/live-data');
  const existingOverlay = existingRes.ok ? await existingRes.json() : {};

  const myResults = {
      'M001': {
        homeGoals: 2, awayGoals: 0, status: 'FT', source: 'gemini-autonomous',
        chronicle: 'Mexico defeated South Africa 2-0. Julián Quiñones scored the opening goal. Raúl Jiménez doubled the lead. The match was notable for its aggressive play, resulting in three red cards.',
        mvp: findId('MEX', 'Quiñones'),
        formations: { home: '4-3-3', away: '4-3-3' }
      }
  };

  const overlay = {
    ...existingOverlay,
    results: {
      ...(existingOverlay.results || {}),
      ...myResults
    }
  };

  console.log(JSON.stringify(overlay.results['M001'], null, 2));
}

run().catch(console.error);
