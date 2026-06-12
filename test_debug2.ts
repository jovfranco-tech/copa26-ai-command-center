import { PLAYERS } from './packages/shared/src/dataset/index.js';
import { TEAMS } from './packages/shared/src/dataset/index.js';
import { PROVIDER_TLA_ALIAS } from './packages/shared/src/resultsMapping.js';

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

const providerScorers = [
  { player: { name: 'In-beom Hwang' }, team: { tla: 'KOR' }, goals: 1, assists: 1 }
];

const codes = new Set(TEAMS.map((t) => t.code));
const out: any = {};
for (const s of providerScorers) {
  let teamCode = s.team.tla;
  if (!codes.has(teamCode)) {
    teamCode = Object.keys(PROVIDER_TLA_ALIAS).find(k => PROVIDER_TLA_ALIAS[k as keyof typeof PROVIDER_TLA_ALIAS] === teamCode) || teamCode;
    teamCode = PROVIDER_TLA_ALIAS[teamCode as keyof typeof PROVIDER_TLA_ALIAS] ?? teamCode;
  }
  
  const roster = PLAYERS.filter((p) => p.team === teamCode);
  console.log("TeamCode:", teamCode, "Roster length:", roster.length);
  
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
}
