import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyARtWft2X8kCxXhQKNS506f885G5zphMt4",
  authDomain: "fifa-quiniela-2026-jovs.firebaseapp.com",
  projectId: "fifa-quiniela-2026-jovs",
  storageBucket: "fifa-quiniela-2026-jovs.firebasestorage.app",
  messagingSenderId: "252571103268",
  appId: "1:252571103268:web:37736f5884ea70e512e8b1"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with multi-tab persistent offline cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { db };
