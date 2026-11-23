import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'core'),
      '@programs': path.resolve(__dirname, 'programs'),
    },
  },
  test: {
    root: path.resolve(__dirname, '..'),
    globals: true,
    environment: 'node',
    include: ['VERIF/tests/**/*.test.ts'],
  },
});
