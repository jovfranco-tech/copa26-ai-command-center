import { mock } from '../packages/shared/src/index';

function check(team, nameFragment) {
  const p = mock.PLAYERS.find(p => p.team === team && p.name.toLowerCase().includes(nameFragment.toLowerCase()));
  if (!p) console.log(`FAIL: ${team} - ${nameFragment}`);
  else console.log(`OK: ${team} - ${nameFragment} -> ${p.name}`);
}

check('SUI', 'Sommer');
check('SUI', 'Embolo');
check('SUI', 'Xhaka');
check('QAT', 'Barsham');
check('BRA', 'Vini');
check('BRA', 'Rodrygo');
check('BRA', 'Endrick');
check('BRA', 'Alisson');
check('MAR', 'Bounou');
check('SCO', 'McGinn');
check('SCO', 'McTominay');
check('SCO', 'Gunn');
check('HAI', 'Pierrot');
check('AUS', 'Ryan');
check('TUR', 'Cakir');

