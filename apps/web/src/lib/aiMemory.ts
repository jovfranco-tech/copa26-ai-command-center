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
}

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

export function saveAIMemory(record: Omit<AIMemoryRecord, 'id' | 'createdAt'>): AIMemoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  const item: AIMemoryRecord = {
    ...record,
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...readAIMemory()].slice(0, MAX_RECORDS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearAIMemory(): AIMemoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  localStorage.removeItem(KEY);
  return [];
}
