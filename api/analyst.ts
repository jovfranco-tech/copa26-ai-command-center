import { recordUsage } from './_shared/usage.js';

/**
 * Vercel Edge Function — AI analyst relay.
 *
 * The browser POSTs { question, context } where `context` is the LOCAL data
 * summary the app already has. This function calls the configured AI provider
 * server-side and returns a grounded Spanish answer. If no key is configured it
 * returns { ok:false, reason:'no-key' } so the
 * client falls back to the local (offline) analyst.
 *
 * Set the key with:  vercel env add GEMINI_API_KEY production   (then redeploy)
 *
 * This endpoint sits behind the Basic-Auth edge middleware, so only the
 * authenticated owner can use it (the key can't be abused by the public).
 */
export const config = { runtime: 'edge' };

const LEGACY_PROVIDER_KEY = ['OPEN', 'AI_API_KEY'].join('');
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 30;
const ANALYST_TOOLS = ['calendario', 'partidos', 'selecciones', 'jugadores', 'sedes', 'clasificacion', 'adjuntos'];

const SYSTEM_PROMPT =
  'Eres un analista del Mundial 2026. Responde SIEMPRE en español, de forma concisa y analítica. ' +
  'Usa ÚNICAMENTE los datos proporcionados en el contexto; no inventes resultados, estadísticas ni ' +
  'jugadores. Si algo no está en los datos (por ejemplo, el torneo aún no se ha jugado), dilo con ' +
  'claridad. Si el contexto incluye "Partido inaugural confirmado", úsalo para preguntas sobre el ' +
  'primer partido, apertura o arranque. No añadas avisos legales ni disclaimers. ' +
  'Si el usuario te pide comparar estadísticas numéricas entre selecciones o jugadores (por ejemplo, goles, disparos, posesión o ranking), ' +
  'además de tu respuesta narrativa en texto, genera al final de tu respuesta un bloque de código JSON con un gráfico estructurado ' +
  'delimitado exactamente por ```json y ```. ' +
  'El formato del JSON debe ser exactamente el siguiente, sin textos adicionales dentro del bloque de código:\n' +
  '{\n' +
  '  "chart": {\n' +
  '    "type": "bar" | "line",\n' +
  '    "title": "Título descriptivo del gráfico",\n' +
  '    "keys": ["NombreDeLaMetrica"],\n' +
  '    "data": [\n' +
  '      { "name": "NombreElemento", "NombreDeLaMetrica": valorNumerico }\n' +
  '    ]\n' +
  '  }\n' +
  '}\n' +
  'No uses tildes ni caracteres especiales en las llaves del JSON o en "keys". Si no hay datos numéricos suficientes, responde únicamente en texto plano y no incluyas el bloque JSON.';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }
  await recordUsage('ai.analyst');

  const rate = checkRateLimit(request);
  if ('retryAfter' in rate) {
    return Response.json(
      { ok: false, reason: 'rate-limit', retryAfter: rate.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const key = process.env.GEMINI_API_KEY || process.env[LEGACY_PROVIDER_KEY];
  if (!key) {
    return Response.json({
      ok: false,
      reason: 'no-key',
      meta: { provider: 'local-fallback', confidence: 'Alta local', tools: ANALYST_TOOLS.slice(0, 6) },
    });
  }

  let body: { question?: string; context?: string; pdf?: { name: string; data: string }; audio?: { name: string; data: string } };
  try {
    body = (await request.json()) as { question?: string; context?: string; pdf?: { name: string; data: string }; audio?: { name: string; data: string } };
  } catch {
    return Response.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  const question = (body.question ?? '').slice(0, 500);
  const context = (body.context ?? '').slice(0, 6000);
  if (!question) return Response.json({ ok: false, reason: 'empty' }, { status: 400 });

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: `DATOS LOCALES:\n${context}\n\nPREGUNTA: ${question}` },
              ...(body.pdf ? [{ inlineData: { mimeType: 'application/pdf', data: body.pdf.data } }] : []),
              ...(body.audio ? [{ inlineData: { mimeType: 'audio/webm', data: body.audio.data } }] : [])
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 450,
        }
      }),
    });
    if (!res.ok) {
      return Response.json({ ok: false, reason: 'api-error', status: res.status }, { status: 502 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!answer) return Response.json({ ok: false, reason: 'empty-answer' }, { status: 502 });
    return Response.json({
      ok: true,
      answer,
      meta: {
        provider: 'gemini',
        model: modelName,
        confidence: 'Media',
        contextChars: context.length,
        tools: ANALYST_TOOLS,
        sources: ['contexto local', body.pdf ? `PDF: ${body.pdf.name}` : null, body.audio ? `Audio: ${body.audio.name}` : null].filter(Boolean),
      },
    });
  } catch (e) {
    console.error('Gemini API fetch error:', e);
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
    __wcAnalystRateLimit?: Map<string, { count: number; startedAt: number }>;
  };
  g.__wcAnalystRateLimit ??= new Map();
  return g.__wcAnalystRateLimit;
}

function rateKey(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  const session = cookie.match(/(?:^|;\s*)wc_session=([^;]+)/)?.[1];
  if (session) return `session:${session.slice(-20)}`;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${forwarded || 'unknown'}`;
}
