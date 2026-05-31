import { existsSync } from 'node:fs';
import { resolveDbFilePath } from './paths.js';

export type PoolPersistenceMode = 'remote-libsql' | 'local-sqlite' | 'missing';

export interface PoolPersistenceStatus {
  mode: PoolPersistenceMode;
  ready: boolean;
  durable: boolean;
  label: string;
  detail: string;
}

export function getPoolPersistenceStatus(): PoolPersistenceStatus {
  const url = process.env.DATABASE_URL?.trim();
  if (url && /^(libsql|https|wss):\/\//.test(url)) {
    return {
      mode: 'remote-libsql',
      ready: true,
      durable: true,
      label: 'Base persistente remota',
      detail: 'DATABASE_URL remoto configurado para compartir quiniela entre dispositivos.',
    };
  }

  if (existsSync(resolveDbFilePath())) {
    return {
      mode: 'local-sqlite',
      ready: true,
      durable: !process.env.VERCEL,
      label: process.env.VERCEL ? 'SQLite local temporal' : 'SQLite local',
      detail: process.env.VERCEL
        ? 'En Vercel se recomienda DATABASE_URL remoto; el filesystem de funciones no es una base familiar durable.'
        : `Usando ${resolveDbFilePath()}`,
    };
  }

  return {
    mode: 'missing',
    ready: false,
    durable: false,
    label: 'Base pendiente',
    detail: 'Configura DATABASE_URL remoto o corre pnpm db:migrate en local antes de sincronizar quinielas.',
  };
}

export function persistentDbRequiredResponse(): Response | null {
  const persistence = getPoolPersistenceStatus();
  if (persistence.ready) return null;
  return Response.json(
    {
      ok: false,
      error: 'persistent-db-required',
      persistence,
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
