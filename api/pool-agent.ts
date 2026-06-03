import { recordUsage } from './_shared/usage.js';
import { getPoolAgentSystemPrompt, PROMPT_META } from './_shared/systemPrompts.js';

/**
 * Vercel Edge Function — AI pool co-pilot.
 *
 * Receives the matches list and the desired AI agent profile (optimista | stats | contrarian).
 * Calls the configured AI provider and returns structured match predictions and a tactical brief.
 */
export const config = { runtime: 'edge' };

const LEGACY_PROVIDER_KEY = ['OPEN', 'AI_API_KEY'].join('');
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 8;

const SYSTEM_PROMPTS = {
  optimista: getPoolAgentSystemPrompt('optimista'),
  stats: getPoolAgentSystemPrompt('stats'),
  contrarian: getPoolAgentSystemPrompt('contrarian'),
};

interface MatchInput {
  id: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  date?: string;
  time?: string;
  stage?: string;
  venueName?: string;
  weatherLabel?: string;
  weatherConfidence?: string;
  dataConfidence?: string;
}

interface PoolAgentMeta {
  confidence: string;
  dataUsed: string[];
  ignoredData: string[];
  warning: string;
}

function buildGroundedContext(matches: MatchInput[]): string {
  const rows = matches.slice(0, 72).map((m) => ({
    id: m.id,
    partido: `${m.homeName || m.home} vs ${m.awayName || m.away}`,
    codigos: `${m.home}-${m.away}`,
    fecha: [m.date, m.time].filter(Boolean).join(' '),
    fase: m.stage ?? 'Fase pendiente',
    sede: m.venueName ?? 'Sede no enviada',
    clima: m.weatherLabel ?? 'Clima no enviado',
    confianzaClima: m.weatherConfidence ?? 'Pendiente',
    confianzaDatos: m.dataConfidence ?? 'Calendario local',
  }));

  return [
    'CONTEXTO DISPONIBLE PARA PRONOSTICAR:',
    '- Fuente: calendario local del Mundial 2026, selecciones, sede y clima base cuando exista.',
    '- No se adjuntan noticias externas, lesiones, sanciones, árbitros ni alineaciones confirmadas.',
    '- Usa tu filosofía de agente como estilo de predicción, pero conserva honestidad sobre datos faltantes.',
    JSON.stringify(rows, null, 2),
  ].join('\n');
}

function normalizeMeta(meta: unknown): PoolAgentMeta {
  const value = meta && typeof meta === 'object' ? meta as Partial<PoolAgentMeta> : {};
  return {
    confidence: typeof value.confidence === 'string' ? value.confidence : 'Media',
    dataUsed: Array.isArray(value.dataUsed) ? value.dataUsed.filter((item): item is string => typeof item === 'string').slice(0, 6) : ['calendario', 'selecciones'],
    ignoredData: Array.isArray(value.ignoredData)
      ? value.ignoredData.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : ['lesiones', 'alineaciones', 'noticias externas'],
    warning:
      typeof value.warning === 'string'
        ? value.warning
        : 'Pronóstico previo: no incluye noticias, lesiones ni alineaciones confirmadas.',
  };
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

  const systemPrompt = SYSTEM_PROMPTS[agent];
  const userContent = `${buildGroundedContext(matches)}\n\nPARTIDOS A PRONOSTICAR:\n${JSON.stringify(matches, null, 2)}\n\nDevuelve pronósticos para todos los IDs enviados. Ajusta confianza y warning según los datos faltantes.`;

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
      return Response.json({
        ok: true,
        brief: parsed.brief,
        predictions: parsed.predictions,
        meta: normalizeMeta(parsed.meta),
      });
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
