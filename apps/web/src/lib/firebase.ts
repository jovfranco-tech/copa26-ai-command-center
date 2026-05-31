import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { POOL_FIRESTORE_CONFIG } from '@worldcup/shared';

const app = initializeApp(POOL_FIRESTORE_CONFIG);

// Initialize Firestore with multi-tab persistent offline cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { db };
