import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'simulator'),
  base: './',
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'core'),
      '@programs': path.resolve(__dirname, 'programs'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'simulator/dist'),
    emptyOutDir: true,
  },
});
