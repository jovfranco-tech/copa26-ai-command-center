export interface DataAuditEntry {
  timestamp: string;
  entityType: 'match' | 'team' | 'player' | 'venue' | 'lineup';
  entityId: string;
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  source: 'manual' | 'live-overlay' | 'scraper' | 'ai-vision' | 'admin';
  operator?: string;
}

const LOG_KEY = 'wc_data_audit_log';
const MAX_ENTRIES = 200;

export function readAuditLog(): DataAuditEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function appendAuditEntry(entry: Omit<DataAuditEntry, 'timestamp'>): DataAuditEntry[] {
  const full: DataAuditEntry = { ...entry, timestamp: new Date().toISOString() };
  const log = [full, ...readAuditLog()].slice(0, MAX_ENTRIES);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }
  return log;
}

export function clearAuditLog(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(LOG_KEY);
}
