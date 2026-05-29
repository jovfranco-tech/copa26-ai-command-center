/* ============================================================
   FIFA Private World Cup Dashboard — local mock data
   Plausible 2026-style tournament: 48 teams, 12 groups, 16 venues.
   All data is fictional/plausible for design purposes only.
   ============================================================ */
(function () {
  "use strict";

  const RAW_TEAMS = [
    ["Argentina", "ARG", "#75AADB", "#ffffff", 1],
    ["France", "FRA", "#1f3a93", "#e23636", 2],
    ["Spain", "ESP", "#c8102e", "#f4c430", 3],
    ["England", "ENG", "#ffffff", "#cf142b", 4],
    ["Brazil", "BRA", "#f7d417", "#1c8a4d", 5],
    ["Portugal", "POR", "#006847", "#c8102e", 6],
    ["Netherlands", "NED", "#ec5a13", "#1b3c8f", 7],
    ["Belgium", "BEL", "#e30613", "#f4c430", 8],
    ["Germany", "GER", "#111111", "#f4c430", 9],
    ["Croatia", "CRO", "#c8102e", "#1b3c8f", 10],
    ["Italy", "ITA", "#1d6fb8", "#0d2d63", 11],
    ["Uruguay", "URU", "#56a0d3", "#0a1a2f", 12],
    ["Colombia", "COL", "#f4c430", "#003087", 13],
    ["Morocco", "MAR", "#c1272d", "#006233", 14],
    ["USA", "USA", "#1b3c8f", "#c8102e", 15],
    ["Mexico", "MEX", "#1c8a4d", "#c8102e", 16],
    ["Canada", "CAN", "#d52b1e", "#ffffff", 17],
    ["Japan", "JPN", "#0a2a6b", "#e23636", 18],
    ["South Korea", "KOR", "#c8102e", "#0a2a6b", 19],
    ["Senegal", "SEN", "#1c8a4d", "#f4c430", 20],
    ["Switzerland", "SUI", "#d52b1e", "#ffffff", 21],
    ["Denmark", "DEN", "#c60c30", "#ffffff", 22],
    ["Austria", "AUT", "#cf142b", "#ffffff", 23],
    ["Ecuador", "ECU", "#f4c430", "#003087", 24],
    ["Australia", "AUS", "#f4c430", "#1c6b3c", 25],
    ["Ukraine", "UKR", "#0057b7", "#ffd700", 26],
    ["Sweden", "SWE", "#005baf", "#f4c430", 27],
    ["Poland", "POL", "#ffffff", "#dc143c", 28],
    ["Nigeria", "NGA", "#1c8a4d", "#ffffff", 29],
    ["Ivory Coast", "CIV", "#ec5a13", "#1c8a4d", 30],
    ["Egypt", "EGY", "#c8102e", "#111111", 31],
    ["Ghana", "GHA", "#c8102e", "#f4c430", 32],
    ["Cameroon", "CMR", "#1c8a4d", "#c8102e", 33],
    ["Tunisia", "TUN", "#c8102e", "#ffffff", 34],
    ["Algeria", "ALG", "#1c8a4d", "#ffffff", 35],
    ["Serbia", "SRB", "#c8102e", "#0a2a6b", 36],
    ["Turkey", "TUR", "#c8102e", "#ffffff", 37],
    ["Norway", "NOR", "#c60c30", "#0a2a6b", 38],
    ["Czechia", "CZE", "#11457e", "#d7141a", 39],
    ["Hungary", "HUN", "#1c8a4d", "#c8102e", 40],
    ["Peru", "PER", "#d91023", "#ffffff", 41],
    ["Chile", "CHI", "#0039a6", "#d52b1e", 42],
    ["Paraguay", "PAR", "#d52b1e", "#0038a8", 43],
    ["Costa Rica", "CRC", "#002b7f", "#c8102e", 44],
    ["Panama", "PAN", "#005293", "#c8102e", 45],
    ["Saudi Arabia", "KSA", "#1c6b3c", "#ffffff", 46],
    ["Iran", "IRN", "#1c8a4d", "#c8102e", 47],
    ["Qatar", "QAT", "#7a1336", "#ffffff", 48],
  ];

  const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

  const TEAMS = RAW_TEAMS.map((t, i) => ({
    id: t[1], name: t[0], code: t[1], colorA: t[2], colorB: t[3], ranking: t[4],
    group: GROUP_LETTERS[Math.floor(i / 4)],
    confederation: ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"][i % 6],
  }));

  const teamById = {};
  TEAMS.forEach((t) => (teamById[t.id] = t));

  const GROUPS = GROUP_LETTERS.map((g) => ({
    letter: g, teams: TEAMS.filter((t) => t.group === g).map((t) => t.id),
  }));

  const VENUES = [
    { id: "nyc", city: "New York / New Jersey", country: "USA", stadium: "East Rutherford Stadium", capacity: 82500, surface: "Grass" },
    { id: "dal", city: "Dallas", country: "USA", stadium: "Arlington Stadium", capacity: 80000, surface: "Grass" },
    { id: "kc", city: "Kansas City", country: "USA", stadium: "Kansas City Stadium", capacity: 76416, surface: "Grass" },
    { id: "lax", city: "Los Angeles", country: "USA", stadium: "Inglewood Stadium", capacity: 70240, surface: "Grass" },
    { id: "sf", city: "Bay Area", country: "USA", stadium: "Santa Clara Stadium", capacity: 68500, surface: "Grass" },
    { id: "sea", city: "Seattle", country: "USA", stadium: "Seattle Stadium", capacity: 69000, surface: "Turf" },
    { id: "mia", city: "Miami", country: "USA", stadium: "Miami Gardens Stadium", capacity: 65326, surface: "Grass" },
    { id: "atl", city: "Atlanta", country: "USA", stadium: "Atlanta Stadium", capacity: 71000, surface: "Turf" },
    { id: "hou", city: "Houston", country: "USA", stadium: "Houston Stadium", capacity: 72220, surface: "Grass" },
    { id: "phi", city: "Philadelphia", country: "USA", stadium: "Philadelphia Stadium", capacity: 69796, surface: "Grass" },
    { id: "bos", city: "Boston", country: "USA", stadium: "Foxborough Stadium", capacity: 65878, surface: "Grass" },
    { id: "tor", city: "Toronto", country: "Canada", stadium: "Toronto Stadium", capacity: 45736, surface: "Turf" },
    { id: "van", city: "Vancouver", country: "Canada", stadium: "Vancouver Stadium", capacity: 54500, surface: "Turf" },
    { id: "mex", city: "Mexico City", country: "Mexico", stadium: "Mexico City Stadium", capacity: 87523, surface: "Grass" },
    { id: "gdl", city: "Guadalajara", country: "Mexico", stadium: "Guadalajara Stadium", capacity: 48071, surface: "Grass" },
    { id: "mty", city: "Monterrey", country: "Mexico", stadium: "Monterrey Stadium", capacity: 53500, surface: "Grass" },
  ];

  const ROUND_PAIRS = [[0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2]];

  function seededRand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  const MATCHES = [];
  let matchSeq = 1;
  const baseDate = new Date("2026-06-11T00:00:00");
  const kickoffTimes = ["12:00", "15:00", "18:00", "21:00"];
  const TODAY = new Date("2026-06-19T00:00:00");

  GROUPS.forEach((grp, gi) => {
    const t = grp.teams;
    ROUND_PAIRS.forEach((order, round) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + round * 5 + (gi % 6));
      const pairs = [[t[order[0]], t[order[1]]], [t[order[2]], t[order[3]]]];
      pairs.forEach((p, pi) => {
        const seed = matchSeq * 13.37;
        const homeGoals = Math.floor(seededRand(seed) * 4);
        const awayGoals = Math.floor(seededRand(seed + 7) * 3);
        const mdate = new Date(date);
        const status = mdate < TODAY ? "FT" : (mdate.toDateString() === TODAY.toDateString() ? (pi === 0 && round === 1 ? "LIVE" : "UPCOMING") : "UPCOMING");
        const venue = VENUES[(gi * 2 + pi + round) % VENUES.length];
        const possH = status === "UPCOMING" ? null : 42 + Math.floor(seededRand(seed + 3) * 18) + (homeGoals - awayGoals);
        const shotsH = status === "UPCOMING" ? null : 7 + Math.floor(seededRand(seed + 4) * 8) + homeGoals;
        const shotsA = status === "UPCOMING" ? null : 6 + Math.floor(seededRand(seed + 5) * 7) + awayGoals;
        MATCHES.push({
          id: "M" + String(matchSeq).padStart(3, "0"),
          stage: "Group " + grp.letter, group: grp.letter,
          round: "Matchday " + (round + 1), matchday: round + 1,
          home: p[0], away: p[1],
          homeGoals: status === "UPCOMING" ? null : homeGoals,
          awayGoals: status === "UPCOMING" ? null : awayGoals,
          status, minute: status === "LIVE" ? 67 : null,
          date: mdate.toISOString().slice(0, 10),
          time: kickoffTimes[matchSeq % kickoffTimes.length],
          venue: venue.id,
          possH, shotsH, shotsA,
          shotsTH: shotsH == null ? null : Math.max(homeGoals, Math.round(shotsH * 0.4)),
          shotsTA: shotsA == null ? null : Math.max(awayGoals, Math.round(shotsA * 0.4)),
        });
        matchSeq++;
      });
    });
  });

  function computeStandings() {
    const table = {};
    TEAMS.forEach((t) => {
      table[t.id] = { team: t.id, group: t.group, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0, form: [] };
    });
    MATCHES.filter((m) => m.status === "FT").forEach((m) => {
      const h = table[m.home], a = table[m.away];
      h.P++; a.P++;
      h.GF += m.homeGoals; h.GA += m.awayGoals;
      a.GF += m.awayGoals; a.GA += m.homeGoals;
      if (m.homeGoals > m.awayGoals) { h.W++; a.L++; h.Pts += 3; h.form.push("W"); a.form.push("L"); }
      else if (m.homeGoals < m.awayGoals) { a.W++; h.L++; a.Pts += 3; a.form.push("W"); h.form.push("L"); }
      else { h.D++; a.D++; h.Pts++; a.Pts++; h.form.push("D"); a.form.push("D"); }
    });
    Object.values(table).forEach((r) => (r.GD = r.GF - r.GA));
    return table;
  }
  const STANDINGS = computeStandings();

  function groupTable(letter) {
    return GROUPS.find((g) => g.letter === letter).teams
      .map((id) => STANDINGS[id])
      .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
  }

  const POS = { GK: "Goalkeeper", DF: "Defender", MF: "Midfielder", FW: "Forward" };
  const RAW_PLAYERS = [
    ["Lionel Aguilar", "ARG", "FW", "Inter Miami", 33, 5, 3, 540, 1, 0, 10],
    ["Julián Bravo", "ARG", "FW", "Atlético", 24, 4, 1, 470, 0, 0, 9],
    ["Enzo Castro", "ARG", "MF", "Chelsea", 23, 1, 4, 540, 2, 0, 24],
    ["Kylian Mercier", "FRA", "FW", "Real Madrid", 27, 6, 2, 510, 1, 0, 10],
    ["Aurélien Dubois", "FRA", "MF", "Real Madrid", 25, 2, 3, 540, 1, 0, 8],
    ["Théo Laurent", "FRA", "DF", "Bayern", 28, 0, 1, 540, 2, 0, 5],
    ["Pedro Ramos", "ESP", "MF", "Barcelona", 18, 3, 5, 500, 0, 0, 16],
    ["Lamine Vega", "ESP", "FW", "Barcelona", 18, 4, 4, 480, 1, 0, 19],
    ["Rodri Núñez", "ESP", "MF", "Man City", 28, 1, 2, 540, 3, 0, 16],
    ["Harry Kingsley", "ENG", "FW", "Bayern", 32, 5, 1, 540, 0, 0, 9],
    ["Jude Bellamy", "ENG", "MF", "Real Madrid", 22, 4, 3, 540, 1, 0, 10],
    ["Bukayo Sterling", "ENG", "FW", "Arsenal", 24, 3, 4, 500, 0, 0, 7],
    ["Vinícius Santos", "BRA", "FW", "Real Madrid", 25, 5, 2, 510, 2, 0, 7],
    ["Rodrigo Lima", "BRA", "FW", "Real Madrid", 24, 3, 3, 470, 1, 0, 11],
    ["Bruno Carvalho", "BRA", "MF", "Man Utd", 30, 2, 4, 540, 1, 0, 8],
    ["Cristiano Sousa", "POR", "FW", "Al-Nassr", 41, 4, 0, 450, 1, 0, 7],
    ["Bernardo Pires", "POR", "MF", "Man City", 30, 2, 3, 540, 0, 0, 20],
    ["Rafael Leite", "POR", "FW", "Milan", 26, 3, 2, 480, 2, 0, 17],
    ["Cody van Dijk", "NED", "FW", "Liverpool", 29, 4, 1, 510, 1, 0, 9],
    ["Frenkie Bakker", "NED", "MF", "Barcelona", 28, 1, 3, 540, 2, 0, 21],
    ["Romelu Lukas", "BEL", "FW", "Napoli", 32, 4, 1, 500, 1, 0, 9],
    ["Kevin Verhoeven", "BEL", "MF", "Man City", 34, 2, 5, 510, 0, 0, 7],
    ["Jamal Wagner", "GER", "MF", "Bayern", 23, 3, 4, 540, 1, 0, 10],
    ["Florian Wirtzel", "GER", "MF", "Liverpool", 22, 2, 3, 520, 0, 0, 17],
    ["Niko Havel", "CRO", "MF", "Real Madrid", 39, 1, 2, 480, 2, 0, 10],
    ["Marco Rossini", "ITA", "FW", "Inter", 27, 3, 1, 500, 1, 0, 9],
    ["Federico Conti", "ITA", "MF", "Juventus", 25, 1, 2, 540, 2, 0, 14],
    ["Darwin Núñez Jr", "URU", "FW", "Liverpool", 26, 4, 1, 490, 3, 0, 9],
    ["Federico Valdez", "URU", "MF", "Real Madrid", 27, 2, 3, 540, 1, 0, 15],
    ["James Restrepo", "COL", "MF", "León", 34, 3, 4, 510, 0, 0, 10],
    ["Luis Díaz Mejía", "COL", "FW", "Liverpool", 29, 4, 2, 500, 1, 0, 7],
    ["Achraf Benali", "MAR", "DF", "PSG", 27, 1, 3, 540, 2, 0, 2],
    ["Hakim Ziadi", "MAR", "MF", "Galatasaray", 32, 2, 2, 500, 1, 0, 7],
    ["Christian Pulaski", "USA", "FW", "Milan", 27, 3, 2, 510, 0, 0, 10],
    ["Gio Reyes", "USA", "MF", "Dortmund", 23, 2, 3, 470, 1, 0, 7],
    ["Hirving Lozano Jr", "MEX", "FW", "San Diego", 30, 3, 1, 490, 2, 0, 22],
    ["Santiago Gómez", "MEX", "FW", "Feyenoord", 25, 2, 2, 480, 0, 0, 9],
    ["Alphonso Devon", "CAN", "FW", "Bayern", 25, 2, 3, 510, 1, 0, 19],
    ["Takefusa Kubota", "JPN", "MF", "Real Sociedad", 24, 3, 2, 500, 0, 0, 11],
    ["Sadio Diallo", "SEN", "FW", "Al-Nassr", 34, 3, 1, 480, 1, 0, 10],
    ["Victor Oseni", "NGA", "FW", "Napoli", 27, 4, 0, 500, 2, 0, 9],
    ["Mohamed Sabry", "EGY", "FW", "Liverpool", 34, 4, 2, 510, 0, 0, 11],
    ["Erling Haavard", "NOR", "FW", "Man City", 26, 6, 1, 520, 1, 0, 9],
    ["Dušan Vlahić", "SRB", "FW", "Juventus", 26, 3, 0, 470, 2, 0, 9],
    ["Hakan Yıldız", "TUR", "MF", "Inter", 30, 2, 3, 500, 1, 0, 10],
    ["Robert Lewinski", "POL", "FW", "Barcelona", 38, 3, 1, 460, 1, 0, 9],
  ];

  const PLAYERS = RAW_PLAYERS.map((p, i) => ({
    id: "P" + String(i + 1).padStart(3, "0"),
    name: p[0], team: p[1], pos: p[2], posLong: POS[p[2]], club: p[3],
    age: p[4], goals: p[5], assists: p[6], minutes: p[7], yellow: p[8], red: p[9], number: p[10],
  }));

  const BRACKET = {
    r32: [
      ["ARG", "SUI"], ["NED", "POL"], ["ESP", "DEN"], ["BRA", "AUS"],
      ["FRA", "CIV"], ["POR", "EGY"], ["ENG", "ECU"], ["GER", "PER"],
      ["BEL", "KOR"], ["CRO", "USA"], ["ITA", "GHA"], ["URU", "JPN"],
      ["COL", "NOR"], ["MAR", "SRB"], ["MEX", "TUR"], ["SEN", "SWE"],
    ],
  };

  const ALERTS = [
    { id: "a1", type: "goal", text: "Mercier scores for France vs Ivory Coast", time: "12m", team: "FRA" },
    { id: "a2", type: "ko", text: "Spain kickoff in 2h — vs Denmark", time: "2h", team: "ESP" },
    { id: "a3", type: "lineup", text: "Argentina lineup announced", time: "45m", team: "ARG" },
    { id: "a4", type: "result", text: "Brazil 2–1 Australia — Full Time", time: "1h", team: "BRA" },
  ];

  const FAV_DEFAULTS = { teams: ["ARG", "ESP"], players: ["P001", "P007"], matches: [] };

  // ---- Goalkeepers (saves / clean sheets leaderboard) ----
  const RAW_GK = [
    ["Emiliano Vargas", "ARG", 14, 2], ["Mike Doorman", "NED", 13, 2], ["Unai Soler", "ESP", 12, 3],
    ["Jordan Pickwell", "ENG", 11, 1], ["Alisson Becker Jr", "BRA", 12, 2], ["Diogo Coster", "POR", 10, 1],
    ["Yann Sommerfeld", "SUI", 15, 1], ["Manuel Neumann", "GER", 11, 2], ["Bono Hassan", "MAR", 13, 3],
    ["Matt Turner", "USA", 12, 1], ["Guillermo Ochoa Jr", "MEX", 14, 1], ["André Onan", "CMR", 10, 0],
  ];
  const GOALKEEPERS = RAW_GK.map((g, i) => ({
    id: "GK" + (i + 1), name: g[0], team: g[1], saves: g[2], cleanSheets: g[3], pos: "GK",
  }));

  function topScorers(n) {
    return [...PLAYERS].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, n || 10);
  }
  function topAssists(n) {
    return [...PLAYERS].sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, n || 10);
  }
  function matchesByDate(dateStr) { return MATCHES.filter((m) => m.date === dateStr); }
  function venueById(id) { return VENUES.find((v) => v.id === id); }
  function playersByTeam(code) { return PLAYERS.filter((p) => p.team === code); }

  // ---- Local cache / sync meta (cosmetic, local-only cues) ----
  const META = {
    lastSync: "Today · 18:42",
    cacheStatus: "Fresh",
    assets: { crests: 48, photos: 46, venues: 16, flags: 48 },
    db: "wc2026.local.json",
    sizeMB: 4.7,
  };

  window.WC = {
    TEAMS, teamById, GROUPS, GROUP_LETTERS, VENUES, MATCHES, PLAYERS, GOALKEEPERS,
    STANDINGS, BRACKET, ALERTS, FAV_DEFAULTS, META, TODAY: TODAY.toISOString().slice(0, 10),
    groupTable, topScorers, topAssists, matchesByDate, venueById, playersByTeam,
  };
})();
