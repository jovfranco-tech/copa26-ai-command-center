/**
 * Vercel Edge Function — AI analyst relay.
 *
 * The browser POSTs { question, context } where `context` is the LOCAL data
 * summary the app already has. This function calls OpenAI server-side using
 * OPENAI_API_KEY (never exposed to the client) and returns a grounded Spanish
 * answer. If no key is configured it returns { ok:false, reason:'no-key' } so the
 * client falls back to the local (offline) analyst.
 *
 * Set the key with:  vercel env add OPENAI_API_KEY production   (then redeploy)
 *
 * This endpoint sits behind the Basic-Auth edge middleware, so only the
 * authenticated owner can use it (the key can't be abused by the public).
 */
export const config = { runtime: 'edge' };

const SYSTEM_PROMPT =
  'Eres un analista del Mundial 2026. Responde SIEMPRE en español, de forma concisa y analítica. ' +
  'Usa ÚNICAMENTE los datos proporcionados en el contexto; no inventes resultados, estadísticas ni ' +
  'jugadores. Si algo no está en los datos (por ejemplo, el torneo aún no se ha jugado), dilo con ' +
  'claridad. No añadas avisos legales ni disclaimers.';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, reason: 'method' }, { status: 405 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ ok: false, reason: 'no-key' });

  let body: { question?: string; context?: string };
  try {
    body = (await request.json()) as { question?: string; context?: string };
  } catch {
    return Response.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  const question = (body.question ?? '').slice(0, 500);
  const context = (body.context ?? '').slice(0, 6000);
  if (!question) return Response.json({ ok: false, reason: 'empty' }, { status: 400 });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 450,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `DATOS LOCALES:\n${context}\n\nPREGUNTA: ${question}` },
        ],
      }),
    });
    if (!res.ok) {
      return Response.json({ ok: false, reason: 'api-error', status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!answer) return Response.json({ ok: false, reason: 'empty-answer' }, { status: 502 });
    return Response.json({ ok: true, answer });
  } catch {
    return Response.json({ ok: false, reason: 'fetch-failed' }, { status: 502 });
  }
}
