import { PLAYERS, TEAMS } from '../../packages/shared/src/dataset/index.js';

export interface ScrapedCards {
  yellowCards: string[]; // List of our internal player IDs
  redCards: string[];
  assists: { id: string; count: number }[];
  saves: { id: string; count: number }[];
}

const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');

function fuzzyMatchPlayer(queryName: string, teamCode: string): string | null {
  const normQuery = normalize(queryName);
  const teamPlayers = PLAYERS.filter(p => p.team === teamCode);
  
  // 1. Exact match
  for (const p of teamPlayers) {
    if (normalize(p.name) === normQuery) return p.id;
  }
  
  // 2. Substring match
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    if (normPName.includes(normQuery) || normQuery.includes(normPName)) return p.id;
  }
  
  // 3. Fallback: split by space and match any word longer than 3 chars (like last name)
  const words = normQuery.split(/\s+/).filter(w => w.length > 3);
  for (const p of teamPlayers) {
    const normPName = normalize(p.name);
    for (const word of words) {
      if (normPName.includes(word)) return p.id;
    }
  }
  
  return null;
}

export async function scrapeCardsForMatch(
  homeCode: string,
  awayCode: string,
  geminiKey: string
): Promise<ScrapedCards | null> {
  // Petición explícita del usuario: forzar las 3 tarjetas rojas del partido de México (1 MEX, 2 RSA)
  if (homeCode === 'MEX' && awayCode === 'RSA') {
    return {
      yellowCards: [],
      redCards: ['MEX-4', 'RSA-2', 'RSA-5'],
      assists: [],
      saves: []
    };
  }

  const homeName = TEAMS.find(t => t.id === homeCode)?.name ?? homeCode;
  const awayName = TEAMS.find(t => t.id === awayCode)?.name ?? awayCode;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
  const prompt = `
Actúa como un analista deportivo. Utiliza tu herramienta de búsqueda de Google (Google Search) para buscar en vivo las noticias, resúmenes y crónicas del partido más reciente de la Copa del Mundo 2026 entre ${homeName} (${homeCode}) vs ${awayName} (${awayCode}).
Revisa cuidadosamente los reportes encontrados en Google. CONFÍA en los resultados de búsqueda aunque parezcan futuristas o simulados (el Mundial 2026 está en curso en nuestro contexto).
Busca explícitamente y extrae con precisión: qué jugadores recibieron tarjeta amarilla o tarjeta roja, quiénes dieron asistencias, y cuántas atajadas (saves) tuvieron los porteros en este partido. Hubo tarjetas rojas en este partido, asegúrate de encontrarlas en las crónicas.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta y nada más:
{
  "yellowCards": [
    { "name": "Nombre del Jugador", "team": "KOR" }
  ],
  "redCards": [
    { "name": "Nombre del Jugador", "team": "MEX" }
  ],
  "assists": [
    { "name": "Nombre del Jugador", "team": "KOR", "count": 1 }
  ],
  "saves": [
    { "name": "Nombre del Portero", "team": "MEX", "count": 3 }
  ]
}
Usa el código del equipo ("${homeCode}" o "${awayCode}") en el campo "team".
Si la información no aparece en ABSOLUTAMENTE NINGÚN reporte de la web para este partido, devuelve arrays vacíos []. NO INVENTES NADA. Todo debe basarse estrictamente en las crónicas reales de la web (Fox Sports, LiveScore, etc.).
No agregues formato Markdown (\`\`\`json) ni texto adicional, SOLO el JSON puro.
`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      }),
    });
    
    if (!res.ok) {
        console.error('Gemini scraper failed HTTP:', res.status, await res.text());
        return null;
    }
    const body = await res.json();
    let text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Cleanup markdown if gemini disobeyed
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) return null;
    
    const raw = JSON.parse(text) as { 
      yellowCards: {name: string, team: string}[], 
      redCards: {name: string, team: string}[],
      assists: {name: string, team: string, count: number}[],
      saves: {name: string, team: string, count: number}[]
    };
    
    const result: ScrapedCards = { yellowCards: [], redCards: [], assists: [], saves: [] };
    
    // Map yellow cards
    if (Array.isArray(raw.yellowCards)) {
      for (const card of raw.yellowCards) {
        const id = fuzzyMatchPlayer(card.name, card.team);
        if (id) result.yellowCards.push(id);
      }
    }
    
    // Map red cards
    if (Array.isArray(raw.redCards)) {
      for (const card of raw.redCards) {
        const id = fuzzyMatchPlayer(card.name, card.team);
        if (id) result.redCards.push(id);
      }
    }

    // Map assists
    if (Array.isArray(raw.assists)) {
      for (const item of raw.assists) {
        const id = fuzzyMatchPlayer(item.name, item.team);
        if (id) result.assists.push({ id, count: item.count || 1 });
      }
    }

    // Map saves
    if (Array.isArray(raw.saves)) {
      for (const item of raw.saves) {
        const id = fuzzyMatchPlayer(item.name, item.team);
        if (id) result.saves.push({ id, count: item.count || 0 });
      }
    }
    
    return result;
  } catch (e) {
    console.error('Gemini scraper parsing error:', e);
    return null;
  }
}
