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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
            }
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
