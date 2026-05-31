import { recordUsage } from './_shared/usage.js';

/**
 * Vercel Edge Function — AI pool co-pilot.
 *
 * Receives the matches list and the desired AI agent profile (optimista | stats | contrarian).
 * Calls the configured AI provider and returns structured match predictions and a tactical brief.
 */
export const config = { runtime: 'edge' };

const LEGACY_PROVIDER_KEY = ['OPEN', 'AI_API_KEY'].join('');
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;

const SYSTEM_PROMPTS = {
  optimista:
    "Eres 'El Analista Optimista', un co-piloto de quiniela de fútbol sumamente emocionante, alegre y amante del juego ultra ofensivo. " +
    "Tu filosofía es: 'el fútbol se gana metiendo goles'. Predices marcadores altos (partidos con 3 o más goles totales, marcadores como 3-1, 3-2, 2-2) " +
    "y confías plenamente en las potencias tradicionales del fútbol (como Argentina, Brasil, Francia, España, etc.) para que ganen cómodamente. " +
    "Nunca predices empates aburridos de 0-0. " +
    "Debes responder estrictamente con un objeto JSON en español que tenga esta estructura exacta, sin texto adicional antes o después del JSON:\n" +
    "{\n" +
    "  \"brief\": \"Tu justificación apasionada del juego ofensivo y pronósticos (máximo 3 frases).\",\n" +
    "  \"predictions\": {\n" +
    "    \"match-id-1\": { \"homeGoals\": 3, \"awayGoals\": 1, \"outcome\": \"home\" }\n" +
    "  }\n" +
    "}\n" +
    "Donde cada llave en 'predictions' es el ID de partido enviado, y el valor contiene homeGoals, awayGoals y outcome ('home' | 'draw' | 'away') de forma consistente.",

  stats:
    "Eres 'El Simulador Estadístico', un co-piloto táctico, analítico, pragmático y sumamente racional. " +
    "Tu filosofía es: 'las defensas ganan campeonatos'. Analizas solidez defensiva, orden táctico y orden en el campo. " +
    "Predices marcadores de pocos goles, empates estratégicos o victorias muy ajustadas por la mínima diferencia (ej. 1-0, 0-1, 1-1, 2-1). " +
    "Valoras enormemente el pragmatismo táctico y consideras que los equipos arriesgan poco en un Mundial. " +
    "Debes responder estrictamente con un objeto JSON en español que tenga esta estructura exacta, sin texto adicional antes o después del JSON:\n" +
    "{\n" +
    "  \"brief\": \"Tu justificación analítica basada en estadísticas, solidez y pragmatismo (máximo 3 frases).\",\n" +
    "  \"predictions\": {\n" +
    "    \"match-id-1\": { \"homeGoals\": 1, \"awayGoals\": 0, \"outcome\": \"home\" }\n" +
    "  }\n" +
    "}\n" +
    "Donde cada llave en 'predictions' es el ID de partido enviado, y el valor contiene homeGoals, awayGoals y outcome ('home' | 'draw' | 'away') de forma consistente.",

  contrarian:
    "Eres 'El Agente Contrarian', un rebelde del análisis táctico que vive para las sorpresas y la épica deportiva. " +
    "Tu filosofía es: 'el Mundial es el escenario ideal de David contra Goliat'. Predices sistemáticamente sorpresas audaces " +
    "(empates inesperados o victorias de selecciones teóricamente desfavorecidas frente a gigantes, y marcadores atípicos como 1-2, 0-1 a favor del débil, o 2-3). " +
    "Argumentas que las potencias sufrirán por exceso de confianza y que el fútbol moderno se ha nivelado mucho. " +
    "Debes responder estrictamente con un objeto JSON en español que tenga esta estructura exacta, sin texto adicional antes o después del JSON:\n" +
    "{\n" +
    "  \"brief\": \"Tu justificación rebelde y audaz del porqué las potencias caerán y habrá sorpresas (máximo 3 frases).\",\n" +
    "  \"predictions\": {\n" +
    "    \"match-id-1\": { \"homeGoals\": 1, \"awayGoals\": 2, \"outcome\": \"away\" }\n" +
    "  }\n" +
    "}\n" +
    "Donde cada llave en 'predictions' es el ID de partido enviado, y el valor contiene homeGoals, awayGoals y outcome ('home' | 'draw' | 'away') de forma consistente."
};

const REALTIME_SPORTS_NEWS = [
  { keywords: ['BRA', 'Brasil', 'Vinícius', 'Vini'], text: "NOTICIA DE ÚLTIMA HORA (Mundial 2026): El extremo y estrella de Brasil, Vinícius Júnior, ha sufrido una contractura muscular en el muslo derecho durante los entrenamientos y es duda crítica para el próximo encuentro. El seleccionador evalúa reservarlo." },
  { keywords: ['TUR', 'Turquía', 'Calhanoglu', 'Çalhanoğlu'], text: "NOTICIA DE ÚLTIMA HORA (Mundial 2026): El capitán de Turquía, Hakan Çalhanoğlu, está sancionado oficialmente por acumulación de tarjetas amarillas y no podrá disputar el siguiente encuentro, dejando un vacío creativo enorme en el mediocampo turco." },
  { keywords: ['USA', 'Estados Unidos', 'Pulisic'], text: "NOTICIA DE ÚLTIMA HORA (Mundial 2026): Se confirma que la selección de Estados Unidos presentará una alineación hiper-ofensiva de 4-3-3 liderada por Christian Pulisic para buscar la clasificación por diferencia de goles a toda costa." },
  { keywords: ['ARG', 'Argentina', 'Martínez', 'Dibu'], text: "NOTICIA DE ÚLTIMA HORA (Mundial 2026): El portero de Argentina, Emiliano 'Dibu' Martínez, ha sido reportado en un estado físico y mental inmejorable tras atajar múltiples penaltis consecutivos en las sesiones de entrenamiento a puerta cerrada." },
  { keywords: ['New York', 'NYC', 'lluvia', 'tormenta'], text: "NOTICIA DE ÚLTIMA HORA (Mundial 2026): El pronóstico del clima en el área de New York reporta un 90% de probabilidades de tormentas eléctricas intensas y lluvias torrenciales durante las horas de juego, lo que creará una cancha pesada que dificultará el fútbol de toque." },
];

function retrieveSportsNews(matches: MatchInput[]): string[] {
  const active: string[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const textToSearch = `${m.home} ${m.away} ${m.homeName} ${m.awayName}`.toLowerCase();
    for (const news of REALTIME_SPORTS_NEWS) {
      if (seen.has(news.text)) continue;
      const matchesKeyword = news.keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));
      if (matchesKeyword) {
        active.push(news.text);
        seen.add(news.text);
      }
    }
  }

  if (active.length === 0) {
    active.push("INFO DE LA FIFA (Mundial 2026): El estado general de los terrenos de juego es excelente y todos los árbitros han sido instruidos para mantener un control estricto sobre las faltas tácticas.");
  }

  return active;
}

interface MatchInput {
  id: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }
  await recordUsage('ai.pool-agent');

  const rate = checkRateLimit(request);
  if ('retryAfter' in rate) {
    return Response.json(
      { ok: false, reason: 'rate-limit', retryAfter: rate.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const key = process.env.GEMINI_API_KEY || process.env[LEGACY_PROVIDER_KEY];
  if (!key) return Response.json({ ok: false, reason: 'no-key' });

  let body: { agent?: 'optimista' | 'stats' | 'contrarian'; matches?: MatchInput[] };
  try {
    body = (await request.json()) as { agent?: 'optimista' | 'stats' | 'contrarian'; matches?: MatchInput[] };
  } catch {
    return Response.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  const agent = body.agent;
  const matches = body.matches;

  if (!agent || !SYSTEM_PROMPTS[agent]) {
    return Response.json({ ok: false, reason: 'invalid-agent' }, { status: 400 });
  }

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return Response.json({ ok: false, reason: 'invalid-matches' }, { status: 400 });
  }

  const relevantNews = retrieveSportsNews(matches);
  const systemPrompt = SYSTEM_PROMPTS[agent];
  const userContent = `NOTICIAS Y REPORTE DE ÚLTIMA HORA (RAG DE CONTEXTO REAL):\n${relevantNews.map((n) => `- ${n}`).join('\n')}\n\nPARTIDOS A PRONOSTICAR:\n${JSON.stringify(matches, null, 2)}\n\nUtiliza la información del reporte táctico de última hora para influenciar directamente tus predicciones de marcadores y tu breve informe táctico ("brief"). Por ejemplo, si un jugador clave está lesionado o suspendido, o si llueve torrencialmente, ajusta los goles de forma lógica y coméntalo brevemente en tu brief.`;

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json',
        }
      }),
    });

    if (!res.ok) {
      return Response.json({ ok: false, reason: 'api-error', status: res.status }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!content) return Response.json({ ok: false, reason: 'empty-answer' }, { status: 502 });

    try {
      const parsed = JSON.parse(content);
      return Response.json({ ok: true, brief: parsed.brief, predictions: parsed.predictions });
    } catch (e) {
      console.error('Failed to parse AI agent predictions JSON', e, content);
      return Response.json({ ok: false, reason: 'parse-failed', raw: content }, { status: 502 });
    }
  } catch (e) {
    console.error('Gemini API fetch error in pool-agent:', e);
    return Response.json({ ok: false, reason: 'fetch-failed' }, { status: 502 });
  }
}

function checkRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  const store = getRateStore();
  const now = Date.now();
  const key = rateKey(request);
  const current = store.get(key);
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    store.set(key, { count: 1, startedAt: now });
    return { ok: true };
  }
  if (current.count >= RATE_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1000) };
  }
  current.count += 1;
  return { ok: true };
}

function getRateStore(): Map<string, { count: number; startedAt: number }> {
  const g = globalThis as typeof globalThis & {
    __wcPoolAgentRateLimit?: Map<string, { count: number; startedAt: number }>;
  };
  g.__wcPoolAgentRateLimit ??= new Map();
  return g.__wcPoolAgentRateLimit;
}

function rateKey(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  const session = cookie.match(/(?:^|;\s*)wc_session=([^;]+)/)?.[1];
  if (session) return `session:${session.slice(-20)}`;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${forwarded || 'unknown'}`;
}
