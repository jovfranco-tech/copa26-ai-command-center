import type { IngestionConfig } from '../config.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random delay inside the configured 4–10s window. Concurrency stays at 1. */
export async function politeDelay(cfg: IngestionConfig): Promise<number> {
  const span = Math.max(0, cfg.maxDelayMs - cfg.minDelayMs);
  const ms = cfg.minDelayMs + Math.floor(Math.random() * (span + 1));
  await sleep(ms);
  return ms;
}
