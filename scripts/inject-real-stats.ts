import { mock } from '../packages/shared/src/index.js';

function findId(team: string, nameFragment: string) {
  const p = mock.PLAYERS.find(p => p.team === team && p.name.toLowerCase().includes(nameFragment.toLowerCase()));
  if (!p) throw new Error(`Player not found: ${team} - ${nameFragment}`);
  return p.id;
}

async function run() {
  const existingRes = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/live-data');
  const existingOverlay = existingRes.ok ? await existingRes.json() : { results: {}, lineups: {}, metrics: {}, playerStats: {}, scrapedMatches: [] };

  const myPlayerStats = {
      // M001: MEX 2-0 RSA
      [findId('MEX', 'Quiñones')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('MEX', 'Jiménez')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('RSA', 'Sithole')]: { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 },
      [findId('RSA', 'Zwane')]: { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 },
      [findId('MEX', 'Montes')]: { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 },

      // M002: KOR 2-1 CZE
      [findId('CZE', 'Krejčí')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('CZE', 'Souček')]: { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 },
      [findId('KOR', 'Hwang In')]: { goals: 1, assists: 1, yellow: 0, red: 0, saves: 0 },
      [findId('KOR', 'Lee Kang')]: { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 },
      [findId('KOR', 'Oh Hyeon')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('CZE', 'Staněk')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 3 },
      [findId('KOR', 'Jo Hyeon')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 },

      // M007: CAN 1-1 BIH
      [findId('BIH', 'Lukić')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('BIH', 'Vasilj')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 6 },
      [findId('CAN', 'Larin')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('CAN', 'Crépeau')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 5 },

      // M019: USA 4-1 PAR
      [findId('USA', 'Balogun')]: { goals: 2, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('USA', 'Pulisic')]: { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 },
      [findId('PAR', 'Alderete')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('USA', 'McKennie')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('USA', 'Turner')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 2 },
      [findId('PAR', 'Gatito')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 5 },

      // M008: QAT 0-2 SUI (Finished recently at ~14:00)
      [findId('SUI', 'Embolo')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('SUI', 'Xhaka')]: { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      [findId('SUI', 'Kobel')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 3 },
      [findId('QAT', 'Barsham')]: { goals: 0, assists: 0, yellow: 0, red: 0, saves: 6 },
  };

  const myResults = {
      'M001': {
        homeGoals: 2, awayGoals: 0, status: 'FT', source: 'manual',
        chronicle: 'Mexico defeated South Africa 2-0. Julián Quiñones scored the opening goal. Raúl Jiménez doubled the lead. The match was notable for its aggressive play, resulting in three red cards.',
        mvp: findId('MEX', 'Quiñones'),
        formations: { home: '4-3-3', away: '4-3-3' }
      },
      'M002': {
        homeGoals: 2, awayGoals: 1, status: 'FT', source: 'manual',
        chronicle: 'South Korea defeated the Czech Republic 2-1. The Czech Republic took the lead through Ladislav Krejčí. South Korea responded with goals from Hwang In-beom and Oh Hyeon-gyu.',
        mvp: findId('KOR', 'Hwang In'),
        formations: { home: '4-2-3-1', away: '3-5-2' }
      },
      'M007': {
        homeGoals: 1, awayGoals: 1, status: 'FT', source: 'manual',
        chronicle: 'Canada and Bosnia and Herzegovina played to a 1-1 draw. Jovo Lukić scored for Bosnia. Cyle Larin leveled the score for Canada.',
        mvp: findId('CAN', 'Larin'),
        formations: { home: '4-4-2', away: '3-5-2' }
      },
      'M019': {
        homeGoals: 4, awayGoals: 1, status: 'FT', source: 'manual',
        chronicle: 'The USMNT kicked off with a 4-1 victory over Paraguay. Folarin Balogun scored a brace. Alderete scored for Paraguay. Reyna and McKennie had strong performances.',
        mvp: findId('USA', 'Balogun'),
        formations: { home: '4-3-3', away: '4-4-2' }
      },
      'M008': {
        homeGoals: 0, awayGoals: 2, status: 'FT', source: 'manual',
        chronicle: 'Switzerland opened their campaign with a solid 2-0 victory over Qatar. Breel Embolo opened the scoring, and captain Granit Xhaka sealed the win with a powerful strike from distance.',
        mvp: findId('SUI', 'Xhaka'),
        formations: { home: '3-5-2', away: '4-2-3-1' }
      }
  };

  const myScrapedMatches = ['M001', 'M002', 'M007', 'M019', 'M008'];

  // Remove the future matches that I accidentally injected earlier
  const cleanPlayerStats = { ...existingOverlay.playerStats };
  const futurePlayers = [
      findId('BRA', 'Vinícius'), findId('BRA', 'Raphinha'), findId('BRA', 'Endrick'), findId('MAR', 'Bounou'), findId('BRA', 'Alisson'),
      findId('SCO', 'McGinn'), findId('SCO', 'McTominay'), findId('HAI', 'Pierrot'), findId('SCO', 'Gunn'),
      findId('AUS', 'Ryan'), findId('TUR', 'Çakır')
  ];
  for (const pid of futurePlayers) {
      delete cleanPlayerStats[pid];
  }

  const cleanResults = { ...existingOverlay.results };
  delete cleanResults['M013'];
  delete cleanResults['M014'];
  delete cleanResults['M020'];

  const cleanScrapedMatches = existingOverlay.scrapedMatches?.filter(m => !['M013', 'M014', 'M020'].includes(m)) || [];

  const overlay = {
    ...existingOverlay,
    updatedAt: new Date().toISOString(),
    scrapedMatches: Array.from(new Set([...cleanScrapedMatches, ...myScrapedMatches])),
    playerStats: {
      ...cleanPlayerStats,
      ...myPlayerStats
    },
    results: {
      ...cleanResults,
      ...myResults
    }
  };

  console.log("SENDING updatedAt:", overlay.updatedAt);
  const res = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/admin-upload-blob', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-password': process.env.ADMIN_PASSWORD || '',
      'x-temp-secret': '123456789',
      'x-filename': 'live-overlay.json'
    },
    body: JSON.stringify(overlay)
  });

  const json = await res.json();
  console.log('Injected real stats with merge:', res.status, JSON.stringify(json));
}

run().catch(console.error);
