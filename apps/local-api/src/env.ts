/** Local API configuration. Refuses to bind to anything but the loopback. */
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { LOCAL_ONLY } from '@worldcup/shared';
import { REPO_ROOT } from '@worldcup/db';

// Load .env.local (gitignored) then .env, both from the repo root.
loadEnv({ path: join(REPO_ROOT, '.env.local') });
loadEnv({ path: join(REPO_ROOT, '.env') });

const host = process.env.LOCAL_API_HOST ?? LOCAL_ONLY.defaultApiHost;
const port = Number(process.env.LOCAL_API_PORT ?? LOCAL_ONLY.defaultApiPort);

/**
 * Hard guard: this dashboard is local-only. If someone tries to expose the API
 * on a public interface (e.g. 0.0.0.0), refuse to start.
 */
export function assertLocalOnly(h: string): void {
  if (!LOCAL_ONLY.allowedHosts.includes(h as (typeof LOCAL_ONLY.allowedHosts)[number])) {
    throw new Error(
      `[local-api] Refusing to bind to "${h}". This API is local-only and may only listen on ${LOCAL_ONLY.allowedHosts.join(
        ', ',
      )}. Set LOCAL_API_HOST to a loopback address.`,
    );
  }
}

export const env = {
  host,
  port,
  repoRoot: REPO_ROOT,
};
