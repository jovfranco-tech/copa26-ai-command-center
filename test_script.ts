import { PLAYERS } from './packages/shared/src/dataset/index.js';
console.log(PLAYERS.filter(p => p.team === 'MEX').map(p => p.id + ' ' + p.name).join('\n'));
