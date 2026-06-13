import { config } from 'dotenv';
config({ path: '.env.local' });
import { getOverlay, putOverlay } from '../api/_shared/overlay.js';
import { PLAYERS } from '../packages/shared/src/dataset/index.js';

const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

function fuzzyMatchPlayer(queryName: string, teamCode: string): string | null {
  const normQuery = normalize(queryName);
  const teamPlayers = PLAYERS.filter(p => p.team === teamCode);
  
  for (const p of teamPlayers) {
    if (normalize(p.name) === normQuery) return p.id;
  }
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    if (normPName.includes(normQuery) || normQuery.includes(normPName)) return p.id;
  }
  const words = normQuery.split(/\s+/).filter(w => w.length > 3);
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    for (const word of words) {
      if (normPName.includes(word)) return p.id;
    }
  }
  return null;
}

const mockResult = {
  homeGoals: 2,
  awayGoals: 0,
  yellowCards: [],
  redCards: [
    { name: "Cesar Montes", team: "MEX" },
    { name: "Sphephelo Sithole", team: "RSA" },
    { name: "Themba Zwane", team: "RSA" }
  ],
  assists: [
    { name: "Edson Alvarez", team: "MEX", count: 1 }
  ],
  saves: [
    { name: "Ronwen Williams", team: "RSA", count: 4 },
    { name: "Guillermo Ochoa", team: "MEX", count: 2 }
  ],
  goals: [
    { name: "Julian Quinones", team: "MEX", count: 1 },
    { name: "Raul Jimenez", team: "MEX", count: 1 }
  ]
};

async function run() {
  console.log('Obteniendo overlay...');
  const overlay = await getOverlay();
  overlay.playerStats = overlay.playerStats || {};
  overlay.results = overlay.results || {};
  overlay.scrapedMatches = overlay.scrapedMatches || [];

  const matchId = 'm001';
  
  overlay.results[matchId] = {
    homeGoals: mockResult.homeGoals,
    awayGoals: mockResult.awayGoals,
    status: 'FT',
    minute: 90,
    source: 'gemini-autonomous'
  };

  overlay.scrapedMatches.push(matchId);

  const processStat = (name: string, team: string, type: 'yellow' | 'red' | 'saves' | 'assists' | 'goals', increment: number) => {
    const pid = fuzzyMatchPlayer(name, team);
    if (pid) {
      overlay.playerStats![pid] = overlay.playerStats![pid] || { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 };
      overlay.playerStats![pid][type] = (overlay.playerStats![pid][type] || 0) + increment;
      console.log(`Aplicado ${increment} ${type} a ${name} (${pid})`);
    } else {
      console.error(`No se encontró el jugador: ${name}`);
    }
  };

  mockResult.yellowCards.forEach((x: any) => processStat(x.name, x.team, 'yellow', 1));
  mockResult.redCards.forEach((x: any) => processStat(x.name, x.team, 'red', 1));
  mockResult.assists.forEach((x: any) => processStat(x.name, x.team, 'assists', x.count));
  mockResult.saves.forEach((x: any) => processStat(x.name, x.team, 'saves', x.count));
  mockResult.goals.forEach((x: any) => processStat(x.name, x.team, 'goals', x.count));

  await putOverlay(overlay);
  console.log('Guardado exitoso. El usuario puede recargar para validar.');
}

run().catch(console.error);
