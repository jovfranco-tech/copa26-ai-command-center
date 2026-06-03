/**
 * Unit tests for aiMemory.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readAIMemory,
  saveAIMemory,
  clearAIMemory,
  entityMemory,
  summarizeOldMemory,
  getMemoryStats,
  MAX_RECORDS_EXPORT,
  type AIMemoryInput,
  type AIMemoryRecord,
} from '../aiMemory';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
};
vi.stubGlobal('localStorage', mockLocalStorage);

beforeEach(() => {
  store = {};
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeInput(overrides: Partial<AIMemoryInput> = {}): AIMemoryInput {
  return {
    question: 'Test question',
    answer: 'Test answer',
    mode: 'local',
    context: 'test',
    sources: ['unit-test'],
    confidence: 'Alta',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// readAIMemory
// ---------------------------------------------------------------------------
describe('readAIMemory', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(readAIMemory()).toEqual([]);
  });

  it('returns empty array when stored value is invalid JSON', () => {
    store['wc_ai_memory_v1'] = 'not-json';
    expect(readAIMemory()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    store['wc_ai_memory_v1'] = JSON.stringify({ foo: 'bar' });
    expect(readAIMemory()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saveAIMemory
// ---------------------------------------------------------------------------
describe('saveAIMemory', () => {
  it('creates a record with id and createdAt', () => {
    const result = saveAIMemory(makeInput());
    expect(result.length).toBe(1);
    expect(result[0].id).toMatch(/^ai-/);
    expect(result[0].createdAt).toBeTruthy();
    expect(new Date(result[0].createdAt).getTime()).toBeGreaterThan(0);
  });

  it('prepends new records (newest first)', () => {
    saveAIMemory(makeInput({ question: 'First' }));
    const result = saveAIMemory(makeInput({ question: 'Second' }));
    expect(result[0].question).toBe('Second');
    expect(result[1].question).toBe('First');
  });

  it('caps records at MAX_RECORDS (60)', () => {
    // Seed 60 records
    for (let i = 0; i < 60; i++) {
      saveAIMemory(makeInput({ question: `Q${i}` }));
    }
    expect(readAIMemory().length).toBe(60);

    // Adding one more should still be capped at 60
    const result = saveAIMemory(makeInput({ question: 'Overflow' }));
    expect(result.length).toBe(60);
    expect(result[0].question).toBe('Overflow');
  });
});

// ---------------------------------------------------------------------------
// clearAIMemory
// ---------------------------------------------------------------------------
describe('clearAIMemory', () => {
  it('removes all records', () => {
    saveAIMemory(makeInput());
    saveAIMemory(makeInput());
    expect(readAIMemory().length).toBe(2);

    clearAIMemory();
    expect(readAIMemory()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// entityMemory
// ---------------------------------------------------------------------------
describe('entityMemory', () => {
  it('filters by entityType correctly', () => {
    saveAIMemory(makeInput({ entityType: 'match', entityId: 'm1' }));
    saveAIMemory(makeInput({ entityType: 'team', entityId: 't1' }));
    saveAIMemory(makeInput({ entityType: 'match', entityId: 'm2' }));

    const records = readAIMemory();
    const matchRecords = entityMemory(records, 'match');
    expect(matchRecords.length).toBe(2);
    expect(matchRecords.every((r) => r.entityType === 'match')).toBe(true);
  });

  it('filters by entityId when provided', () => {
    saveAIMemory(makeInput({ entityType: 'match', entityId: 'm1' }));
    saveAIMemory(makeInput({ entityType: 'match', entityId: 'm2' }));

    const records = readAIMemory();
    const filtered = entityMemory(records, 'match', 'm1');
    expect(filtered.length).toBe(1);
    expect(filtered[0].entityId).toBe('m1');
  });

  it('returns empty when entityType is undefined', () => {
    saveAIMemory(makeInput({ entityType: 'match', entityId: 'm1' }));
    const records = readAIMemory();
    expect(entityMemory(records, undefined)).toEqual([]);
  });

  it('returns all records of type tournament regardless of entityId', () => {
    saveAIMemory(makeInput({ entityType: 'tournament', entityId: 'wc2026' }));
    saveAIMemory(makeInput({ entityType: 'tournament' }));

    const records = readAIMemory();
    const filtered = entityMemory(records, 'tournament', 'anything');
    expect(filtered.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// summarizeOldMemory
// ---------------------------------------------------------------------------
describe('summarizeOldMemory', () => {
  it('no-ops when fewer than 3 old records exist', () => {
    // Create 2 "old" records (>7 days)
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const records: AIMemoryRecord[] = [
      { id: 'ai-1', createdAt: new Date().toISOString(), question: 'Recent', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta' },
      { id: 'ai-2', createdAt: oldDate, question: 'Old1', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta' },
      { id: 'ai-3', createdAt: oldDate, question: 'Old2', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta' },
    ];
    store['wc_ai_memory_v1'] = JSON.stringify(records);

    const result = summarizeOldMemory(7);
    // Should return unchanged since only 2 old records
    expect(result.length).toBe(3);
    expect(result[0].id).toBe('ai-1');
  });

  it('compresses old records into a summary', () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const records: AIMemoryRecord[] = [
      { id: 'ai-r1', createdAt: new Date().toISOString(), question: 'Recent', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta' },
      { id: 'ai-o1', createdAt: oldDate, question: 'Old1', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta', entityType: 'match' },
      { id: 'ai-o2', createdAt: oldDate, question: 'Old2', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta', entityType: 'team' },
      { id: 'ai-o3', createdAt: oldDate, question: 'Old3', answer: 'A', mode: 'local', context: 'c', sources: [], confidence: 'Alta', entityType: 'match' },
    ];
    store['wc_ai_memory_v1'] = JSON.stringify(records);

    const result = summarizeOldMemory(7);
    // 1 summary + 1 recent = 2 records
    expect(result.length).toBe(2);
    const summary = result.find((r) => r.id.includes('summary'));
    expect(summary).toBeDefined();
    expect(summary!.question).toContain('3 consultas');
    expect(summary!.answer).toContain('match');
    expect(summary!.answer).toContain('team');
  });
});

// ---------------------------------------------------------------------------
// getMemoryStats
// ---------------------------------------------------------------------------
describe('getMemoryStats', () => {
  it('returns correct totals and percentFull', () => {
    for (let i = 0; i < 30; i++) {
      saveAIMemory(makeInput({ entityType: i % 2 === 0 ? 'match' : 'team' }));
    }

    const stats = getMemoryStats();
    expect(stats.total).toBe(30);
    expect(stats.percentFull).toBe(50); // 30/60 = 50%
    expect(stats.byEntity['match']).toBe(15);
    expect(stats.byEntity['team']).toBe(15);
    expect(stats.oldestDate).toBeTruthy();
    expect(stats.newestDate).toBeTruthy();
  });

  it('returns zeros when memory is empty', () => {
    const stats = getMemoryStats();
    expect(stats.total).toBe(0);
    expect(stats.percentFull).toBe(0);
    expect(stats.oldestDate).toBeNull();
    expect(stats.newestDate).toBeNull();
  });

  it('MAX_RECORDS_EXPORT equals 60', () => {
    expect(MAX_RECORDS_EXPORT).toBe(60);
  });
});
