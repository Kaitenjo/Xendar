import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/public-api.ts'),
      name: 'XendarComponents',
      fileName: format => `xendar-components.${format}.js`
    },
    outDir: path.resolve(__dirname, '../../dist'), // Ensure the outDir is specific to this config
    rollupOptions: {
      output: {
        dir: path.resolve(__dirname, '../../dist') // Explicitly set the output directory
      },
      external: [
        '@xendar/common',
        '@xendar/core'
      ]
    }
  }
});
