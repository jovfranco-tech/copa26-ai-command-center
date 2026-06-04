const CACHE_NAME = 'wc-pwa-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/brand/fwc26-emblem.svg',
  '/brand/fwc26-wordmark.svg',
  '/brand/fwc26-stacked-wordmark.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Resilient precache: a single missing asset must not abort installation.
      Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only intercept same-origin GET requests; never cache API calls.
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;
  if (req.url.includes('/api/')) return;

  // ── Navigations (HTML documents) → NETWORK-FIRST ─────────────────────────────
  // The document is the one URL whose CONTENT changes but path stays "/". Serving
  // it from cache (stale-while-revalidate) made every new deploy invisible because
  // the cached index.html still referenced the OLD hashed JS/CSS. Always fetch the
  // freshest document; fall back to the cached shell only when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        } catch {
          const cached = (await caches.match(req)) || (await caches.match('/index.html')) || (await caches.match('/'));
          return cached || new Response('Sin conexión a Internet', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // ── Static assets (content-hashed JS/CSS, images, fonts) → stale-while-revalidate ─
  // Hashed filenames change per build, so this is safe: a new build = new URL =
  // cache miss = fresh fetch. Images/photos update in the background.
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const networkFetch = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response('', { status: 504 }));
      return cachedResponse || networkFetch;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pool-picks') {
    event.waitUntil(syncPoolPicks());
  }
});

function syncPoolPicks() {
  return new Promise((resolve, reject) => {
    // Open the IndexedDB database wc_family_pool_db
    const request = indexedDB.open('wc_family_pool_db', 1);
    
    request.onerror = () => {
      console.error('[sw] Failed to open IndexedDB wc_family_pool_db');
      reject();
    };

    request.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.close();
        resolve();
        return;
      }
      
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const getReq = store.get('wc_family_pool');

      getReq.onerror = () => {
        db.close();
        reject();
      };

      getReq.onsuccess = () => {
        db.close();
        const raw = getReq.result;
        if (!raw) {
          resolve();
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          const state = parsed.state;
          const playerName = state?.playerName;
          const picks = state?.picks;

          if (!playerName || !picks || Object.keys(picks).length === 0) {
            resolve();
            return;
          }

          console.log('[sw] Attempting to sync background picks for player:', playerName);
          
          fetchWithBackoff('/api/pool/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, picks })
          })
            .then((res) => {
              if (res.ok) {
                console.log('[sw] Background sync of pool picks successful!');
                resolve();
              } else {
                console.warn('[sw] Sync server returned non-ok status:', res.status);
                reject(); // retry later
              }
            })
            .catch((err) => {
              console.error('[sw] Sync fetch failed after retries:', err);
              reject(); // retry later
            });
        } catch (err) {
          console.error('[sw] Parse error on persisted pool picks:', err);
          resolve(); // don't retry if corrupt
        }
      };
    };
  });
}

function fetchWithBackoff(url, options, retries = 3, delay = 1000) {
  return fetch(url, options)
    .then((res) => {
      if (res.ok) return res;
      if (retries > 0 && (res.status >= 500 || res.status === 429)) {
        console.warn(`[sw] Server temporary error (${res.status}), retrying with exponential backoff in ${delay}ms...`);
        return new Promise((resolve) => setTimeout(resolve, delay))
          .then(() => fetchWithBackoff(url, options, retries - 1, delay * 2));
      }
      return res;
    })
    .catch((err) => {
      if (retries > 0) {
        console.warn(`[sw] Network fetch failed, retrying with exponential backoff in ${delay}ms...`, err);
        return new Promise((resolve) => setTimeout(resolve, delay))
          .then(() => fetchWithBackoff(url, options, retries - 1, delay * 2));
      }
      throw err;
    });
}

