import { readFileSync } from 'fs';

const overlay = {
  "results": {},
  "lineups": {},
  "metrics": {},
  "playerStats": {
    "MEX-24": { "goals": 1, "assists": 0 },
    "MEX-20": { "goals": 1, "assists": 0 },
    "CZE-9": { "goals": 1, "assists": 0 }
  },
  "updatedAt": "2026-06-12T14:40:20.135Z"
};

const mock = {
  PLAYERS: [
    { id: 'ARG-1', name: 'Juan Musso', goals: 0, assists: 0 },
    { id: 'MEX-24', name: 'Julián Quiñones', goals: 0, assists: 0 },
    { id: 'MEX-20', name: 'Raúl Jiménez', goals: 0, assists: 0 }
  ]
};

let LIVE_OVERLAY = overlay;

function overlaidPlayers() {
  if (!LIVE_OVERLAY.playerStats || !Object.keys(LIVE_OVERLAY.playerStats).length) return mock.PLAYERS;
  return mock.PLAYERS.map(p => {
    const stats = LIVE_OVERLAY.playerStats[p.id];
    if (!stats) return p;
    return { ...p, goals: stats.goals, assists: stats.assists };
  });
}

function topScorers(players, n = 10) {
  return [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, n);
}

const overlaid = overlaidPlayers();
console.log(topScorers(overlaid));
