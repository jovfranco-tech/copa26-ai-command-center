export interface AIMemoryRecord {
  id: string;
  createdAt: string;
  question: string;
  answer: string;
  mode: 'remote' | 'local' | 'simulation';
  context: string;
  sources: string[];
  confidence: string;
  model?: string;
  tools?: string[];
  entityType?: 'tournament' | 'match' | 'team' | 'player' | 'pool';
  entityId?: string;
  structured?: AIStructuredAnswer;
  citations?: AICitation[];
}

export interface AIStructuredAnswer {
  prediction?: string;
  risk?: string;
  confidence?: string;
  dataUsed?: string[];
  ignoredData?: string[];
  rationale?: string;
  nextAction?: string;
  quality?: AIQualityCheck;
}

export interface AICitation {
  label: string;
  value: string;
  source: string;
  date?: string;
  confidence?: string;
}

export interface AIQualityCheck {
  score: number;
  label: string;
  flags: string[];
  checkedAt: string;
}

export type AIMemoryInput = Omit<AIMemoryRecord, 'id' | 'createdAt'>;

const KEY = 'wc_ai_memory_v1';
const MAX_RECORDS = 60;

export function readAIMemory(): AIMemoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AIMemoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createAIMemoryRecord(record: AIMemoryInput): AIMemoryRecord {
  return {
    ...record,
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
}

export function saveAIMemory(record: AIMemoryInput): AIMemoryRecord[] {
  return saveAIMemoryRecord(createAIMemoryRecord(record));
}

export function saveAIMemoryRecord(item: AIMemoryRecord): AIMemoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  const next = [item, ...readAIMemory()].slice(0, MAX_RECORDS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearAIMemory(): AIMemoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  localStorage.removeItem(KEY);
  return [];
}

export function entityMemory(
  records: AIMemoryRecord[],
  entityType: AIMemoryRecord['entityType'],
  entityId?: string,
): AIMemoryRecord[] {
  if (!entityType) return [];
  return records.filter((record) => {
    if (record.entityType !== entityType) return false;
    if (!entityId || entityType === 'tournament') return true;
    return record.entityId === entityId;
  });
}

export const MAX_RECORDS_EXPORT = MAX_RECORDS;

/**
 * Compresses AI memory records older than `daysThreshold` into a single summary record.
 * Call this periodically (e.g., on app start) to prevent localStorage overflow.
 * Returns the new memory array after summarization.
 */
export function summarizeOldMemory(daysThreshold = 7): AIMemoryRecord[] {
  const records = readAIMemory();
  const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
  const recent = records.filter((r) => Date.parse(r.createdAt) >= cutoff);
  const old = records.filter((r) => Date.parse(r.createdAt) < cutoff);

  if (old.length < 3) return records; // Not enough old records to summarize

  const topics = [...new Set(old.map((r) => r.entityType ?? 'tournament'))].join(', ');
  const summary: AIMemoryRecord = {
    id: `ai-summary-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    question: `[Resumen automático de ${old.length} consultas anteriores]`,
    answer: `Historial comprimido: ${old.length} consultas sobre ${topics}. Temas: ${old.slice(0, 5).map((r) => r.question.slice(0, 40)).join(' | ')}.`,
    mode: 'local',
    context: 'summary',
    sources: ['historial-local'],
    confidence: 'Alta',
    entityType: 'tournament',
    structured: {
      rationale: `Resumen automático de ${old.length} registros más de ${daysThreshold} días.`,
      dataUsed: ['historial-local'],
    },
  };

  const next = [summary, ...recent].slice(0, MAX_RECORDS);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

/**
 * Returns usage statistics about the current AI memory store.
 */
export function getMemoryStats(): {
  total: number;
  byEntity: Record<string, number>;
  oldestDate: string | null;
  newestDate: string | null;
  percentFull: number;
} {
  const records = readAIMemory();
  const byEntity: Record<string, number> = {};
  for (const r of records) {
    const key = r.entityType ?? 'unknown';
    byEntity[key] = (byEntity[key] ?? 0) + 1;
  }
  return {
    total: records.length,
    byEntity,
    oldestDate: records.length ? records[records.length - 1]!.createdAt : null,
    newestDate: records.length ? records[0]!.createdAt : null,
    percentFull: Math.round((records.length / MAX_RECORDS) * 100),
  };
}
