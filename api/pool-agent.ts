/**
 * Vercel Edge Function — AI pool co-pilot.
 *
 * Receives the matches list and the desired AI agent profile (optimista | stats | contrarian).
 * Calls OpenAI and returns structured match predictions and a tactical brief.
 */
export const config = { runtime: 'edge' };

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

  const rate = checkRateLimit(request);
  if ('retryAfter' in rate) {
    return Response.json(
      { ok: false, reason: 'rate-limit', retryAfter: rate.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const key = process.env.OPENAI_API_KEY;
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

  const systemPrompt = SYSTEM_PROMPTS[agent];
  const userContent = `PARTIDOS A PRONOSTICAR:\n${JSON.stringify(matches, null, 2)}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      return Response.json({ ok: false, reason: 'api-error', status: res.status }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) return Response.json({ ok: false, reason: 'empty-answer' }, { status: 502 });

    try {
      const parsed = JSON.parse(content);
      return Response.json({ ok: true, brief: parsed.brief, predictions: parsed.predictions });
    } catch (e) {
      console.error('Failed to parse AI agent predictions JSON', e, content);
      return Response.json({ ok: false, reason: 'parse-failed', raw: content }, { status: 502 });
    }
  } catch {
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
