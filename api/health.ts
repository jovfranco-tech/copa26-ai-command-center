export const config = { runtime: 'edge' };

export default function handler(request: Request): Response {
  if (request.method !== 'GET') {
    return Response.json({ error: 'method' }, { status: 405 });
  }

  const health = {
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    region: process.env.VERCEL_REGION || 'local',
    checks: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      firebase: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY),
      resultsFeed: Boolean(process.env.RESULTS_SOURCE_URL),
    },
    build: {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
    },
  };

  return Response.json(health, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
