import { PLAYERS } from './packages/shared/src/dataset/index.js';
import { TEAMS } from './packages/shared/src/dataset/index.js';
import { normalize } from './packages/shared/src/resultsMapping.js';

const s = { player: { name: 'In-beom Hwang' }, team: { tla: 'KOR' } };
const codes = new Set(TEAMS.map((t) => t.code));
const teamCode = s.team.tla;
const roster = PLAYERS.filter((p) => p.team === teamCode);

console.log("Roster length:", roster.length);
const n = normalize(s.player.name);
const parts = n.split(' ').filter(Boolean);
console.log("n:", n, "parts:", parts);

let p = roster.find((player) => normalize(player.name) === n);
console.log("Exact match:", p);

p = roster.find((player) => {
  const pNorm = normalize(player.name);
  return parts.length > 0 && parts.every((part) => pNorm.includes(part));
});
console.log("Fuzzy match:", p);
