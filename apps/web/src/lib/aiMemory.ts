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
const MAX_RECORDS = 24;

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
