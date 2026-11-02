import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    '@uncrud/client': fileURLToPath(new URL('./frontend/packages/client/src/index.ts', import.meta.url)),
    '@uncrud/react': fileURLToPath(new URL('./frontend/packages/react/src/index.tsx', import.meta.url)),
  } },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], environment: 'jsdom', maxWorkers: 2 },
});
