import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/lib/query';
import { router } from '@/router';
import { summarizeOldMemory } from '@/lib/aiMemory';
import { reportWebVitals } from '@/lib/webVitals';
import './styles/index.css';
import './styles/pool.css';

// Compress AI memory records older than 7 days to prevent localStorage overflow
summarizeOldMemory();

// Report Core Web Vitals (console in dev, Vercel Analytics in prod)
reportWebVitals();

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root not found');

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

// Global error reporting — sends unhandled errors to monitoring endpoint
if (typeof window !== 'undefined') {
  const reportError = (payload: { type: string; message: string; stack?: string; url?: string }) => {
    // Fire-and-forget — don't block UI
    fetch('/api/monitoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'client-error', ...payload, timestamp: Date.now() }),
    }).catch(() => {}); // Silently fail if monitoring endpoint is down
  };

  window.addEventListener('error', (event) => {
    reportError({
      type: 'uncaught',
      message: event.message,
      stack: event.error?.stack?.slice(0, 500),
      url: event.filename,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      type: 'unhandled-promise',
      message: event.reason?.message || String(event.reason).slice(0, 200),
      stack: event.reason?.stack?.slice(0, 500),
    });
  });
}

if ('serviceWorker' in navigator) {
  // When an updated service worker takes control, reload once so the freshest
  // build is shown immediately — no manual hard-refresh needed.
  let swRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshing) return;
    swRefreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Proactively check for a newer worker on every load.
        reg.update();

        // Listen for waiting service worker (new version available)
        const onUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — show toast before reload
              const toast = document.createElement('div');
              toast.setAttribute('role', 'alert');
              toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;background:#1a1a2e;border:1px solid rgba(201,162,75,0.4);color:#f4efe2;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(8px)';
              toast.innerHTML = '<span style="color:#c9a24b">●</span> Nueva versión disponible <button style="background:#c9a24b;color:#0a0a0a;border:none;padding:4px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;margin-left:8px" id="sw-reload">Actualizar</button>';
              document.body.appendChild(toast);
              document.getElementById('sw-reload')?.addEventListener('click', () => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              });
            }
          });
        };
        reg.addEventListener('updatefound', onUpdateFound);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

