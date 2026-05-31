export type UsageKind =
  | 'ai.analyst'
  | 'ai.pool-agent'
  | 'ai.scan'
  | 'pool.sync'
  | 'pool.picks'
  | 'pool.leaderboard'
  | 'data.sync';

const USAGE_KEYS: UsageKind[] = [
  'ai.analyst',
  'ai.pool-agent',
  'ai.scan',
  'pool.sync',
  'pool.picks',
  'pool.leaderboard',
  'data.sync',
];

export async function recordUsage(kind: UsageKind, units = 1): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `wc:usage:${day}:${kind}`;
  const memory = getMemoryUsage();
  memory.set(key, (memory.get(key) ?? 0) + units);

  const redis = redisConfig();
  if (!redis) return;
  try {
    await fetch(`${redis.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCRBY', key, String(units)],
        ['EXPIRE', key, '2592000'],
      ]),
    });
  } catch {
    // Metrics must never break the family app.
  }
}

export async function readUsageSnapshot(): Promise<{
  provider: 'upstash' | 'memory';
  day: string;
  items: Record<UsageKind, number>;
}> {
  const day = new Date().toISOString().slice(0, 10);
  const redis = redisConfig();
  if (redis) {
    try {
      const keys = USAGE_KEYS.map((kind) => `wc:usage:${day}:${kind}`);
      const response = await fetch(`${redis.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redis.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keys.map((key) => ['GET', key])),
      });
      const data = (await response.json()) as Array<{ result?: string | number | null }>;
      return {
        provider: 'upstash',
        day,
        items: Object.fromEntries(
          USAGE_KEYS.map((kind, index) => [kind, Number(data[index]?.result ?? 0)]),
        ) as Record<UsageKind, number>,
      };
    } catch {
      // Fall through to in-memory snapshot.
    }
  }

  const memory = getMemoryUsage();
  return {
    provider: 'memory',
    day,
    items: Object.fromEntries(
      USAGE_KEYS.map((kind) => [kind, memory.get(`wc:usage:${day}:${kind}`) ?? 0]),
    ) as Record<UsageKind, number>,
  };
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function getMemoryUsage(): Map<string, number> {
  const g = globalThis as typeof globalThis & { __wcUsage?: Map<string, number> };
  g.__wcUsage ??= new Map();
  return g.__wcUsage;
}
