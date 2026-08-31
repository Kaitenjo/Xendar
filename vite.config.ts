import path from 'node:path';
import { defineConfig } from 'vite';

const dirName = import.meta.dirname;

export default defineConfig({
  root: 'src',
  server: {
    open: true,
    port: 4200
  },
  resolve: {
    alias: {
      '@xaendar/common': path.resolve(dirName, 'packages/common/src/public-api.ts'),
      '@xaendar/signals': path.resolve(dirName, 'packages/signals/src/public-api.ts'),
      '@xaendar/types': path.resolve(dirName, 'packages/types/src/public-api.ts'),
    }
  },
  build: {
    target: 'esnext',
    lib: {
      entry: path.resolve(dirName, 'src/test.ts'),
      fileName: () => `test.js`,
      formats: ['es']
    },
    sourcemap: true,
    outDir: path.resolve(dirName, 'dist/src'),
    emptyOutDir: true
  }
});