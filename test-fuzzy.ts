import { PLAYERS } from './packages/shared/src/dataset/index.js';

const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

function fuzzyMatchPlayer(queryName: string, teamCode: string): string | null {
  const normQuery = normalize(queryName);
  const teamPlayers = PLAYERS.filter(p => p.team === teamCode);
  
  // 1. Exact match
  for (const p of teamPlayers) {
    if (normalize(p.name) === normQuery) return p.id;
  }
  
  // 2. Substring match
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    if (normPName.includes(normQuery) || normQuery.includes(normPName)) return p.id;
  }
  
  // 3. Fallback: split by space and match any word longer than 3 chars (like last name)
  const words = normQuery.split(/\s+/).filter(w => w.length > 3);
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    for (const word of words) {
      if (normPName.includes(word)) return p.id;
    }
  }
  
  return null;
}

console.log('Test Montes:', fuzzyMatchPlayer('Cesar Montes', 'MEX'));
console.log('Test Son:', fuzzyMatchPlayer('Heung-min Son', 'KOR'));
console.log('Test Son (different):', fuzzyMatchPlayer('Son', 'KOR'));
