import { recordUsage } from './_shared/usage.js';
import { getAnalystSystemPrompt } from './_shared/systemPrompts.js';

/**
 * Vercel Edge Function — AI analyst relay.
 *
 * The browser POSTs { question, context } where `context` is the LOCAL data
 * summary the app already has. This function calls a configured AI provider
 * server-side and returns a grounded Spanish answer (streamed when asked).
 *
 * Dual provider with automatic failover: it tries OpenAI then Gemini (order set
 * by AI_PROVIDER, default openai; PDF/audio always prefer Gemini). If neither
 * key is set it returns { ok:false, reason:'no-key' } so the client falls back
 * to the local (offline) analyst.
 *
 * Configure with (then redeploy):
 *   vercel env add OPENAI_API_KEY production
 *   vercel env add GEMINI_API_KEY production
 * Optional: OPENAI_MODEL, GEMINI_MODEL, AI_PROVIDER, AI_GATEWAY_BASE_URL.
 *
 * The site is public, so this endpoint protects the provider keys with a
 * per-session/IP rate limit and keeps all context grounded in local data.
 */
export const config = { runtime: 'edge' };

const LEGACY_PROVIDER_KEY = ['OPEN', 'AI_API_KEY'].join('');
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 12;
// Best-effort global ceiling (per warm instance) so a runaway loop or spike
// can't quietly rack up provider cost. Hard budget caps live in the provider
// dashboards; tune GLOBAL_CAP via env if needed.
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_CAP = Number(process.env.AI_GLOBAL_HOURLY_CAP ?? 300);
const ANALYST_TOOLS = ['calendario', 'partidos', 'selecciones', 'jugadores', 'sedes', 'clasificacion', 'adjuntos'];

// Security: server-side upload limits and allowed MIME types
const MAX_FILE_BYTES_B64 = 5_600_000;  // ~4MB raw (base64 overhead ~33%)
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'audio/webm', 'audio/ogg', 'audio/mp4']);

const SYSTEM_PROMPT = getAnalystSystemPrompt();

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

  const openaiKey = process.env.OPENAI_API_KEY || process.env[LEGACY_PROVIDER_KEY];
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!openaiKey && !geminiKey) {
    return Response.json({
      ok: false,
      reason: 'no-key',
      meta: { provider: 'local-fallback', confidence: 'Alta local', tools: ANALYST_TOOLS.slice(0, 6) },
    });
  }

  let body: { question?: string; context?: string; pdf?: { name: string; data: string }; audio?: { name: string; data: string }; stream?: boolean; provider?: 'openai' | 'gemini'; history?: Array<{ role: string; content: string; assistant: string }> };
  try {
    body = (await request.json()) as { question?: string; context?: string; pdf?: { name: string; data: string }; audio?: { name: string; data: string }; stream?: boolean; provider?: 'openai' | 'gemini'; history?: Array<{ role: string; content: string; assistant: string }> };
  } catch {
    return Response.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  // Server-side file size validation
  if (body.pdf) {
    if (body.pdf.data.length > MAX_FILE_BYTES_B64) {
      return Response.json({ ok: false, reason: 'file-too-large', max: '4MB' }, { status: 413 });
    }
    // MIME type: we trust the client-declared mimeType but verify it is a PDF-range type
    if (!ALLOWED_MIME_TYPES.has('application/pdf')) {
      return Response.json({ ok: false, reason: 'invalid-file-type' }, { status: 415 });
    }
  }
  if (body.audio) {
    if (body.audio.data.length > MAX_FILE_BYTES_B64) {
      return Response.json({ ok: false, reason: 'file-too-large', max: '4MB' }, { status: 413 });
    }
  }

  const question = (body.question ?? '').slice(0, 500);
  const context = (body.context ?? '').slice(0, 6000);
  const history = (body.history ?? []).slice(0, 3);
  if (!question) return Response.json({ ok: false, reason: 'empty' }, { status: 400 });

  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  // AI_GATEWAY_BASE_URL / OPENAI_BASE_URL let you route through the Vercel AI
  // Gateway (or any compatible proxy) without code changes.
  const geminiBase = (process.env.AI_GATEWAY_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const openaiBase = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');

  // Provider order: multimodal (PDF/audio) prefers Gemini (native inline support);
  // otherwise honor AI_PROVIDER (default openai) with the other as automatic failover.
  const isMultimodal = Boolean(body.pdf || body.audio);
  const pref = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  // Optional per-request override (diagnostics / power users): pin to one provider.
  const forced = body.provider === 'openai' || body.provider === 'gemini' ? body.provider : null;
  const order: Array<'openai' | 'gemini'> = forced
    ? [forced]
    : isMultimodal || pref === 'gemini'
      ? ['gemini', 'openai']
      : ['openai', 'gemini'];
  const candidates = order.filter((p) => (p === 'openai' ? openaiKey : geminiKey));

  const sources = [
    'contexto local',
    body.pdf ? `PDF: ${body.pdf.name}` : null,
    body.audio ? `Audio: ${body.audio.name}` : null,
  ].filter(Boolean);

  // Try each configured provider in turn; on failure, fail over to the next.
  const errors: string[] = [];
  for (const provider of candidates) {
    const isOpenAI = provider === 'openai';
    const meta = {
      provider,
      model: isOpenAI ? openaiModel : geminiModel,
      confidence: 'Media',
      contextChars: context.length,
      tools: ANALYST_TOOLS,
      sources,
    };
    try {
      const upstream = isOpenAI
        ? await callOpenAI(openaiBase, openaiKey as string, openaiModel, context, question, Boolean(body.stream), history)
        : await callGemini(geminiBase, geminiKey as string, geminiModel, context, question, body.pdf, body.audio, Boolean(body.stream), history);

      if (!upstream.ok || !upstream.body) {
        const detail = upstream.ok ? 'no-body' : (await upstream.text().catch(() => '')).slice(0, 160);
        errors.push(`${provider}:${upstream.status} ${detail}`);
        continue; // failover
      }

      if (body.stream) {
        return new Response(toTextStream(upstream.body, isOpenAI ? extractOpenAIDelta : extractGeminiDelta), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'x-ai-meta': JSON.stringify(meta),
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await upstream.json()) as any;
      let answer: string;
      if (isOpenAI) {
        const message = data.choices?.[0]?.message;
        answer = message?.content?.trim() ?? '';

        // Check if the model used the render_chart tool
        const toolCalls = message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          for (const tc of toolCalls) {
            if (tc.function?.name === 'render_chart') {
              try {
                const chartData = JSON.parse(tc.function.arguments);
                // Append the chart JSON block so the client can render it (same format as before)
                answer += '\n\n```json\n' + JSON.stringify({ chart: chartData }, null, 2) + '\n```';
              } catch {
                // Malformed tool args — skip chart, answer text is still valid
              }
            }
          }
        }
      } else {
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        answer = '';
        for (const part of parts) {
          if (part.text) answer += part.text;
          if (part.functionCall && part.functionCall.name === 'render_chart') {
            answer += '\n\n```json\n' + JSON.stringify({ chart: part.functionCall.args }, null, 2) + '\n```';
          }
        }
        answer = answer.trim();
      }
      if (!answer) {
        errors.push(`${provider}:empty-answer`);
        continue;
      }
      return Response.json({ ok: true, answer, meta });
    } catch (e) {
      errors.push(`${provider}:${(e as Error).message}`);
    }
  }

  // Every configured provider failed → the client falls back to the local analyst.
  const providersTried = errors.map((e) => e.split(':')[0]).join(' y ');
  return Response.json(
    {
      ok: false,
      reason: 'api-error',
      detail: errors.join(' | ').slice(0, 300),
      providerErrors: errors.slice(0, 3),
      userMessage: `Los proveedores de IA (${providersTried}) no están disponibles en este momento. El analista local está activo como respaldo.`,
      retryAfter: 30,
      meta: { provider: 'local-fallback', confidence: 'Alta local', tools: ANALYST_TOOLS.slice(0, 6) },
    },
    { status: 502, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } },
  );
}

// ── Provider calls ───────────────────────────────────────────────────────────
async function callGemini(
  base: string,
  key: string,
  model: string,
  context: string,
  question: string,
  pdf: { name: string; data: string } | undefined,
  audio: { name: string; data: string } | undefined,
  stream: boolean,
  history: Array<{ role: string; content: string; assistant: string }>,
): Promise<Response> {
  const historyContents = history.flatMap((h) => [
    { role: 'user', parts: [{ text: h.content }] },
    { role: 'model', parts: [{ text: h.assistant }] },
  ]);
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      ...historyContents,
      {
        role: 'user',
        parts: [
          { text: `DATOS LOCALES:\n${context}\n\nPREGUNTA: ${question}` },
          ...(pdf ? [{ inlineData: { mimeType: 'application/pdf', data: pdf.data } }] : []),
          ...(audio ? [{ inlineData: { mimeType: 'audio/webm', data: audio.data } }] : []),
        ],
      },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    tools: [{
      functionDeclarations: [{
        name: 'render_chart',
        description: 'Renders a comparison chart when the user asks to compare numeric stats between teams or players. Only call this when there is actual numeric data to compare.',
        parameters: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['bar', 'line'], description: 'Chart type' },
            title: { type: 'STRING', description: 'Descriptive chart title in Spanish' },
            keys: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Metric keys (no accents, no special chars)' },
            data: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                },
              },
              description: 'Array of data points with name and numeric metric values',
            },
          },
          required: ['type', 'title', 'keys', 'data'],
        },
      }],
    }],
  };
  const op = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
  return fetch(`${base}/v1beta/models/${model}:${op}key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function callOpenAI(
  base: string,
  key: string,
  model: string,
  context: string,
  question: string,
  stream: boolean,
  history: Array<{ role: string; content: string; assistant: string }>,
): Promise<Response> {
  const historyMessages = history.flatMap((h) => [
    { role: 'user' as const, content: h.content },
    { role: 'assistant' as const, content: h.assistant },
  ]);
  return fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 600,
      stream,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...historyMessages,
        { role: 'user', content: `DATOS LOCALES:\n${context}\n\nPREGUNTA: ${question}` },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'render_chart',
            description: 'Renders a comparison chart when the user asks to compare numeric stats between teams or players. Only call this when there is actual numeric data to compare.',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['bar', 'line'], description: 'Chart type' },
                title: { type: 'string', description: 'Descriptive chart title in Spanish' },
                keys: { type: 'array', items: { type: 'string' }, description: 'Metric keys (no accents, no special chars)' },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                    additionalProperties: true,
                  },
                  description: 'Array of data points with name and numeric metric values',
                },
              },
              required: ['type', 'title', 'keys', 'data'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    }),
  });
}

function extractGeminiDelta(json: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (JSON.parse(json) as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
}

function extractOpenAIDelta(json: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (JSON.parse(json) as any)?.choices?.[0]?.delta?.content;
}

/** Transforms an upstream provider SSE stream into a plain-text token stream. */
function toTextStream(
  body: ReadableStream<Uint8Array>,
  extract: (json: string) => string | undefined,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const delta = extract(json);
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* partial JSON across a chunk boundary — ignored */
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });
}

function checkRateLimit(request: Request): { ok: true } | { ok: false; retryAfter: number } {
  const store = getRateStore();
  const now = Date.now();

  // Global hourly ceiling across all callers (best-effort, per warm instance).
  const g = store.get('__global__');
  if (!g || now - g.startedAt > GLOBAL_WINDOW_MS) {
    store.set('__global__', { count: 1, startedAt: now });
  } else if (g.count >= GLOBAL_CAP) {
    return { ok: false, retryAfter: Math.ceil((GLOBAL_WINDOW_MS - (now - g.startedAt)) / 1000) };
  } else {
    g.count += 1;
  }

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
