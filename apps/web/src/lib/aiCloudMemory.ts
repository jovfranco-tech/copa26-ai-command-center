import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AIMemoryRecord } from '@/lib/aiMemory';
import { normalizePoolGroupId } from '@/lib/api';

const MAX_CLOUD_RECORDS = 18;

function insightCollection(groupId: string) {
  return collection(db, 'aiInsightGroups', normalizePoolGroupId(groupId), 'records');
}

export async function saveCloudAIInsight(groupId: string, record: AIMemoryRecord): Promise<void> {
  if (!groupId.trim()) return;
  const payload = {
    ...record,
    groupId: normalizePoolGroupId(groupId),
    sharedAt: new Date().toISOString(),
  };
  await setDoc(doc(insightCollection(groupId), record.id), payload);
}

export function listenCloudAIInsights(
  groupId: string,
  onRecords: (records: AIMemoryRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(insightCollection(groupId), orderBy('createdAt', 'desc'), limit(MAX_CLOUD_RECORDS));
  return onSnapshot(
    q,
    (snapshot) => {
      onRecords(snapshot.docs.map((item) => item.data() as AIMemoryRecord));
    },
    (error) => onError?.(error),
  );
}
