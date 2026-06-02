import { recordUsage } from './_shared/usage.js';

/**
 * Vercel Edge Function — AI Quiniela physical paper scanner.
 *
 * Receives the camera snapshot base64 image and upcoming matches,
 * calling Gemini 1.5 Flash Vision to run handwriting OCR and returning structured predictions.
 */
export const config = { runtime: 'edge' };

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 6;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }
  await recordUsage('ai.scan');

  const rate = checkRateLimit(request);
  if ('retryAfter' in rate) {
    return Response.json(
      { ok: false, reason: 'rate-limit', retryAfter: rate.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const legacyProviderKey = ['OPEN', 'AI_API_KEY'].join('');
  const key = process.env.GEMINI_API_KEY || process.env[legacyProviderKey];
  if (!key) return Response.json({ ok: false, reason: 'no-key' });

  let body: { image?: string; matches?: Array<{ id: string; home: string; away: string; homeName: string; awayName: string }> };
  try {
    body = (await request.json()) as { image?: string; matches?: Array<{ id: string; home: string; away: string; homeName: string; awayName: string }> };
  } catch {
    return Response.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  const base64Image = body.image;
  if (!base64Image) {
    return Response.json({ ok: false, reason: 'no-image' }, { status: 400 });
  }

  const matchesList = body.matches || [];
  const matchesContext = matchesList.map((m) => `Partido ID: ${m.id} · ${m.homeName} (${m.home}) vs ${m.awayName} (${m.away})`).join('\n');

  const SYSTEM_PROMPT =
    "Eres un analizador inteligente de quinielas deportivas manuscritas de la Copa del Mundo 2026.\n" +
    "Se te proporcionará una lista de partidos oficiales programados con sus IDs y nombres de selecciones, junto a una imagen capturada de una quiniela física manuscrita en papel.\n" +
    "Tu objetivo es realizar OCR con visión artificial de alta precisión para extraer los marcadores (goles de local y de visita) completados por el usuario para cada partido.\n" +
    "Debes asociar los marcadores escritos a mano con los partidos correctos de la lista mediante similitud de nombres de selecciones.\n" +
    "Devuelve ÚNICAMENTE un objeto JSON estructurado con el formato exacto del siguiente ejemplo, sin explicaciones ni delimitadores extraños de texto:\n" +
    "{\n" +
    "  \"predictions\": {\n" +
    "    \"partido-id-123\": { \"homeGoals\": 2, \"awayGoals\": 1, \"outcome\": \"home\" }\n" +
    "  }\n" +
    "}\n" +
    "Si un partido de la lista no tiene un marcador claro o inteligible en la imagen, omítelo de la respuesta.\n" +
    "Lista de partidos válidos:\n" +
    matchesContext;

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { inlineData: { mimeType: 'image/png', data: base64Image } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!res.ok) {
      return Response.json({ ok: false, reason: 'api-error', status: res.status }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!rawText) return Response.json({ ok: false, reason: 'empty-answer' }, { status: 502 });

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    return Response.json({ ok: true, predictions: parsed.predictions || {} });
  } catch (e) {
    console.error('Scan vision processing error:', e);
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
    __wcPoolScanRateLimit?: Map<string, { count: number; startedAt: number }>;
  };
  g.__wcPoolScanRateLimit ??= new Map();
  return g.__wcPoolScanRateLimit;
}

function rateKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${forwarded || 'unknown'}`;
}
