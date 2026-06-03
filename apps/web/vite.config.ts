import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Local-only dev server. No public deploy target is configured anywhere.
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const env = loadEnv(mode, root, '');
  const apiPort = env.LOCAL_API_PORT ?? '8787';
  const webPort = Number(env.WEB_PORT ?? '5173');
  const apiTarget = env.VITE_LOCAL_API_URL ?? `http://127.0.0.1:${apiPort}`;

  return {
    publicDir: 'static',
    plugins: [react()],
    resolve: {
      alias: {
        '@worldcup/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
        '@worldcup/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // The biggest chunk is the lazy-loaded 3D stadium (three.js). Splitting the
      // heavy vendors into their own cacheable chunks keeps the shared app shell
      // small and lets the browser load 3D / charts only on the routes that need them.
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            // 3D stack — only pulled in by the lazy Estadio 3D route, so isolating it
            // shrinks that route's chunk massively without touching the app shell.
            if (id.includes('/three/') || id.includes('@react-three') || id.includes('/three-')) {
              return 'vendor-three';
            }
            if (id.includes('@tanstack') || id.includes('zustand')) return 'vendor-state';
            // NOTE: do NOT split React / react-dom / charts into their own chunks —
            // doing so reordered chunk init and broke React.createContext at boot.
            return undefined;
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: false,
      proxy: {
        // The browser only ever talks to the local API through this same-origin proxy.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: webPort,
    },
  };
});
