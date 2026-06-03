import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@worldcup/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      '@worldcup/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
