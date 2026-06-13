import { PLAYERS, TEAMS } from '../../packages/shared/src/dataset/index.js';

export interface ScrapedCards {
  homeGoals: number | null;
  awayGoals: number | null;
  yellowCards: string[]; // List of our internal player IDs
  redCards: string[];
  assists: { id: string; count: number }[];
  saves: { id: string; count: number }[];
  chronicle?: string;
  mvp?: string;
  teamStats?: {
    home: { possession: number; shots: number; corners: number; fouls: number };
    away: { possession: number; shots: number; corners: number; fouls: number };
  };
  injuries?: string[];
  formations?: { home: string; away: string };
  timeline?: { minute: number; type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury' | 'other'; player: string; detail: string; team: 'home' | 'away' }[];
}

const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

function fuzzyMatchPlayer(queryName: string, teamCode: string): string | null {
  const normQuery = normalize(queryName);
  const teamPlayers = PLAYERS.filter(p => p.team === teamCode);
  
  for (const p of teamPlayers) {
    if (normalize(p.name) === normQuery) return p.id;
  }
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    if (normPName.includes(normQuery) || normQuery.includes(normPName)) return p.id;
  }
  const words = normQuery.split(/\s+/).filter(w => w.length > 3);
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    for (const word of words) {
      if (normPName.includes(word)) return p.id;
    }
  }
  return null;
}

function parseGeminiResponse(raw: any, homeCode: string, awayCode: string): ScrapedCards {
  const result: ScrapedCards = { 
    homeGoals: typeof raw.homeGoals === 'number' ? raw.homeGoals : null,
    awayGoals: typeof raw.awayGoals === 'number' ? raw.awayGoals : null,
    yellowCards: [], redCards: [], assists: [], saves: [],
    chronicle: raw.chronicle,
    teamStats: raw.teamStats,
    formations: raw.formations,
    injuries: [],
    timeline: []
  };

  if (raw.mvp && raw.mvp.name && raw.mvp.team) {
    const mvpId = fuzzyMatchPlayer(raw.mvp.name, raw.mvp.team);
    if (mvpId) result.mvp = mvpId;
  }

  if (Array.isArray(raw.yellowCards)) {
    for (const card of raw.yellowCards) {
      const id = fuzzyMatchPlayer(card.name, card.team);
      if (id) result.yellowCards.push(id);
    }
  }
  
  if (Array.isArray(raw.redCards)) {
    for (const card of raw.redCards) {
      const id = fuzzyMatchPlayer(card.name, card.team);
      if (id) result.redCards.push(id);
    }
  }

  if (Array.isArray(raw.assists)) {
    for (const item of raw.assists) {
      const id = fuzzyMatchPlayer(item.name, item.team);
      if (id) result.assists.push({ id, count: item.count || 1 });
    }
  }

  if (Array.isArray(raw.saves)) {
    for (const item of raw.saves) {
      const id = fuzzyMatchPlayer(item.name, item.team);
      if (id) result.saves.push({ id, count: item.count || 0 });
    }
  }

  if (Array.isArray(raw.injuries)) {
    for (const item of raw.injuries) {
      const id = fuzzyMatchPlayer(item.name, item.team);
      if (id) result.injuries?.push(id);
    }
  }

  if (Array.isArray(raw.timeline)) {
    for (const item of raw.timeline) {
      let playerId = '';
      if (item.player && item.team) {
        playerId = fuzzyMatchPlayer(item.player, item.team) || item.player;
      }
      result.timeline?.push({
        minute: item.minute,
        type: item.type,
        player: playerId,
        detail: item.detail,
        team: item.team
      });
    }
  }

  return result;
}

const getPrompt = (homeName: string, homeCode: string, awayName: string, awayCode: string, isUrl: boolean, url?: string) => `
Actúa como un analista deportivo experto. ${isUrl ? `Lee el siguiente enlace: ${url}` : `Utiliza Google Search para buscar crónicas del partido más reciente de la Copa del Mundo 2026 entre ${homeName} (${homeCode}) vs ${awayName} (${awayCode}).`}
Revisa cuidadosamente y CONFÍA en los resultados. Busca y extrae:
- Marcador final.
- Tarjetas amarillas/rojas, asistencias, atajadas (saves).
- Crónica del partido (2 párrafos narrativos, tono periodístico profesional).
- El MVP (Jugador del Partido).
- Estadísticas colectivas (posesión, tiros, tiros de esquina, faltas) para ambos equipos.
- Jugadores lesionados.
- Formaciones tácticas (ej. "4-3-3", "4-4-2").
- Línea de tiempo minuto a minuto (goles, tarjetas, cambios, lesiones, otros).

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta y NADA MÁS (sin Markdown \`\`\`json):
{
  "homeGoals": 2,
  "awayGoals": 1,
  "yellowCards": [{ "name": "Jugador", "team": "${homeCode}" }],
  "redCards": [],
  "assists": [{ "name": "Jugador", "team": "${homeCode}", "count": 1 }],
  "saves": [{ "name": "Portero", "team": "${awayCode}", "count": 3 }],
  "chronicle": "El partido fue espectacular...",
  "mvp": { "name": "Jugador", "team": "${homeCode}" },
  "teamStats": {
    "home": { "possession": 60, "shots": 12, "corners": 5, "fouls": 10 },
    "away": { "possession": 40, "shots": 5, "corners": 2, "fouls": 15 }
  },
  "injuries": [{ "name": "Jugador", "team": "${awayCode}" }],
  "formations": { "home": "4-3-3", "away": "4-4-2" },
  "timeline": [
    { "minute": 15, "type": "goal", "player": "Jugador", "team": "${homeCode}", "detail": "Golazo de tiro libre" }
  ]
}
Nota: "type" en timeline debe ser "goal", "yellow_card", "red_card", "substitution", "injury" u "other".
Si un dato no aparece, devuelve el campo nulo o array vacío []. NO INVENTES NADA.
`;

export async function scrapeCardsForMatch(homeCode: string, awayCode: string, geminiKey: string): Promise<ScrapedCards | null> {
  const homeName = TEAMS.find(t => t.code === homeCode)?.name ?? homeCode;
  const awayName = TEAMS.find(t => t.code === awayCode)?.name ?? awayCode;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: getPrompt(homeName, homeCode, awayName, awayCode, false) }] }],
        tools: [{ googleSearch: {} }]
      }),
    });
    
    if (!res.ok) {
      console.error('Gemini API error:', res.status, res.statusText, await res.text());
      return null;
    }
    const body = await res.json();
    let text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      console.error('Empty response from Gemini:', JSON.stringify(body, null, 2));
      return null;
    }
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) return null;
    return parseGeminiResponse(JSON.parse(text), homeCode, awayCode);
  } catch (e) {
    console.error('Gemini scraper error:', e);
    return null;
  }
}

export async function scrapeCardsFromUrl(homeCode: string, awayCode: string, newsUrl: string, geminiKey: string): Promise<ScrapedCards | null> {
  const homeName = TEAMS.find(t => t.id === homeCode)?.name ?? homeCode;
  const awayName = TEAMS.find(t => t.id === awayCode)?.name ?? awayCode;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: getPrompt(homeName, homeCode, awayName, awayCode, true, newsUrl) }] }],
        tools: [{ googleSearch: {} }]
      }),
    });
    
    if (!res.ok) return null;
    const body = await res.json();
    let text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) return null;
    return parseGeminiResponse(JSON.parse(text), homeCode, awayCode);
  } catch (e) {
    console.error('Gemini URL scraper error:', e);
    return null;
  }
}
