import { POOL_FIRESTORE_CONFIG } from '../../packages/shared/src/constants.js';
import type { PoolPersistenceStatus } from '../../packages/db/src/persistence.js';

type PoolOutcome = 'home' | 'draw' | 'away';

export interface FirestorePoolPick {
  outcome?: PoolOutcome;
  homeGoals?: number;
  awayGoals?: number;
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${POOL_FIRESTORE_CONFIG.projectId}/databases/(default)/documents`;

export async function getFirestorePoolPersistenceStatus(): Promise<PoolPersistenceStatus> {
  const base: PoolPersistenceStatus = {
    mode: 'cloud-firestore',
    ready: true,
    durable: true,
    label: 'Cloud Firestore',
    detail: `Quiniela familiar conectada al proyecto ${POOL_FIRESTORE_CONFIG.projectId}.`,
  };

  try {
    const res = await fetch(`${BASE_URL}/poolPicks?pageSize=1&key=${POOL_FIRESTORE_CONFIG.apiKey}`, {
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      return { ...base, label: 'Cloud Firestore verificado' };
    }
    return {
      ...base,
      ready: false,
      label: 'Cloud Firestore pendiente',
      detail: `Firestore esta configurado, pero la verificacion respondio HTTP ${res.status}. Revisa reglas o despliegue de Firebase.`,
    };
  } catch {
    return {
      ...base,
      ready: false,
      label: 'Cloud Firestore sin verificar',
      detail: 'Firestore esta configurado, pero no se pudo verificar conectividad desde la funcion.',
    };
  }
}

export async function writePoolPicksToFirestore(
  playerName: string,
  picks: Record<string, FirestorePoolPick>,
): Promise<void> {
  const cleanName = normalizePlayerName(playerName);
  const res = await fetch(`${BASE_URL}/poolPicks/${encodeURIComponent(cleanName)}?key=${POOL_FIRESTORE_CONFIG.apiKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        picks: {
          mapValue: {
            fields: Object.fromEntries(
              Object.entries(picks).map(([matchId, pick]) => [matchId, pickToFirestoreValue(pick)]),
            ),
          },
        },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`firestore-sync-http-${res.status}`);
  }
}

export function normalizePlayerName(playerName: string): string {
  const clean = playerName.trim().slice(0, 30);
  if (!clean || clean.includes('/')) {
    throw new Error('invalid-player-name');
  }
  return clean;
}

function pickToFirestoreValue(pick: FirestorePoolPick): {
  mapValue: {
    fields: Record<string, { stringValue: string } | { integerValue: string }>;
  };
} {
  const fields: Record<string, { stringValue: string } | { integerValue: string }> = {};
  if (pick.outcome && ['home', 'draw', 'away'].includes(pick.outcome)) {
    fields.outcome = { stringValue: pick.outcome };
  }
  if (Number.isInteger(pick.homeGoals)) {
    fields.homeGoals = { integerValue: String(pick.homeGoals) };
  }
  if (Number.isInteger(pick.awayGoals)) {
    fields.awayGoals = { integerValue: String(pick.awayGoals) };
  }
  return { mapValue: { fields } };
}
