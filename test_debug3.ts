import { PLAYERS } from './packages/shared/src/dataset/index.js';

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

const s = { player: { name: 'In-beom Hwang' }, team: { tla: 'KOR' } };
const roster = PLAYERS.filter((p) => p.team === 'KOR');

const rawName = s.player.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const parts = rawName.split(/[^a-z]+/).filter(Boolean);
const n = normalize(s.player.name);
console.log("n:", n, "parts:", parts);

let p = roster.find((player) => normalize(player.name) === n);
if (!p) {
  p = roster.find((player) => {
    const pNorm = normalize(player.name);
    return parts.length > 0 && parts.every((part) => pNorm.includes(part));
  });
}
console.log("Match:", p);
