import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/lib/query';
import { router } from '@/router';
import './styles/index.css';

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root not found');

createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

