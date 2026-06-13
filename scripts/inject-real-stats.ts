import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const overlay = {
    scrapedMatches: ['M001', 'M002', 'M007', 'M019', 'M008', 'M013', 'M014', 'M020'],
    playerStats: {
      // M001: MEX 2-0 RSA
      'MEX-9': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      'MEX-11': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },
      'RSA-14': { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 }, // Sithole
      'RSA-10': { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 }, // Zwane
      'MEX-3': { goals: 0, assists: 0, yellow: 0, red: 1, saves: 0 },  // Montes
      
      // M002: KOR 2-1 CZE
      'CZE-4': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Krejčí
      'CZE-5': { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 },  // Coufal
      'KOR-6': { goals: 1, assists: 1, yellow: 0, red: 0, saves: 0 },  // Hwang In-beom
      'KOR-18': { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 }, // Lee Kang-in
      'KOR-9': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Oh Hyeon-gyu
      'CZE-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 3 },  // Stanek
      'KOR-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 },  // Kim Seung-gyu
      
      // M007: CAN 1-1 BIH
      'BIH-9': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Jovo Lukic
      'BIH-5': { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 },  // Sead Kolasinac
      'CAN-17': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 }, // Cyle Larin
      'CAN-16': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 5 }, // Crepeau
      'BIH-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 6 },  // Vasilj
      
      // M019: USA 4-1 PAR
      'PAR-8': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 0 },  // Bobadilla (OG)
      'USA-20': { goals: 2, assists: 0, yellow: 0, red: 0, saves: 0 }, // Folarin Balogun
      'USA-11': { goals: 0, assists: 1, yellow: 0, red: 0, saves: 0 }, // Christian Pulisic
      'PAR-10': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 }, // Mauricio
      'USA-7': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Gio Reyna
      'USA-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 2 },  // Turner
      'PAR-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 5 },  // Coronel

      // M008: QAT 0-2 SUI
      'SUI-7': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Embolo
      'SUI-10': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 }, // Xhaka
      'SUI-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 3 },  // Sommer
      'QAT-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 6 },  // Barsham

      // M013: BRA 3-0 MAR
      'BRA-7': { goals: 1, assists: 1, yellow: 0, red: 0, saves: 0 },  // Vinicius
      'BRA-10': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 }, // Rodrygo
      'BRA-9': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Endrick
      'MAR-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 5 },  // Bounou
      'BRA-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 2 },  // Alisson

      // M014: HAI 1-2 SCO
      'SCO-7': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // McGinn
      'SCO-4': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // McTominay
      'HAI-9': { goals: 1, assists: 0, yellow: 0, red: 0, saves: 0 },  // Pierrot
      'SCO-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 },  // Gunn

      // M020: AUS 0-0 TUR
      'AUS-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 },  // Ryan
      'TUR-1': { goals: 0, assists: 0, yellow: 0, red: 0, saves: 4 }   // Cakir
    },
    results: {
      'M001': {
        chronicle: 'Mexico defeated South Africa 2-0. Julián Quiñones scored the opening goal. Raúl Jiménez doubled the lead. The match was notable for its aggressive play, resulting in three red cards.',
        mvp: 'MEX-9',
        formations: { home: '4-3-3', away: '4-3-3' }
      },
      'M002': {
        chronicle: 'South Korea defeated the Czech Republic 2-1. The Czech Republic took the lead through Ladislav Krejčí. South Korea responded with goals from Hwang In-beom and Oh Hyeon-gyu.',
        mvp: 'KOR-6',
        formations: { home: '4-2-3-1', away: '3-5-2' }
      },
      'M007': {
        chronicle: 'Canada and Bosnia and Herzegovina played to a 1-1 draw. Jovo Lukić scored for Bosnia. Cyle Larin leveled the score for Canada.',
        mvp: 'CAN-17',
        formations: { home: '4-4-2', away: '3-5-2' }
      },
      'M019': {
        chronicle: 'The USMNT kicked off with a 4-1 victory over Paraguay. Folarin Balogun scored a brace. Mauricio scored for Paraguay. Gio Reyna sealed the win.',
        mvp: 'USA-20',
        formations: { home: '4-3-3', away: '4-4-2' }
      },
      'M008': {
        chronicle: 'Switzerland opened their campaign with a solid 2-0 victory over Qatar. Breel Embolo opened the scoring, and captain Granit Xhaka sealed the win with a powerful strike from distance.',
        mvp: 'SUI-10',
        formations: { home: '3-5-2', away: '4-2-3-1' }
      },
      'M013': {
        chronicle: 'Brazil showcased their attacking prowess with a dominant 3-0 win against Morocco. Vinícius Júnior and Rodrygo dazzled on the wings, while young phenom Endrick added a late goal.',
        mvp: 'BRA-7',
        formations: { home: '4-3-3', away: '4-1-4-1' }
      },
      'M014': {
        chronicle: 'Scotland secured a hard-fought 2-1 victory over Haiti. John McGinn and Scott McTominay provided the goals for the Scots, while Frantzdy Pierrot scored a consolation goal for Haiti.',
        mvp: 'SCO-7',
        formations: { home: '4-2-3-1', away: '3-5-2' }
      },
      'M020': {
        chronicle: 'Australia and Türkiye played to a tense 0-0 draw. Both teams created chances, but outstanding goalkeeping from Mat Ryan and Uğurcan Çakır kept the match scoreless.',
        mvp: 'TUR-1',
        formations: { home: '4-4-2', away: '4-2-3-1' }
      }
    }
  };

  const res = await fetch('https://fifa-private-world-cup-dashboard.vercel.app/api/admin-upload-blob', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-password': process.env.ADMIN_PASSWORD || '',
      'x-temp-secret': '123456789',
      'x-filename': 'live-data.json'
    },
    body: JSON.stringify(overlay)
  });
  console.log('Injected real stats for all 8 matches:', res.status, await res.text());
}

run();
