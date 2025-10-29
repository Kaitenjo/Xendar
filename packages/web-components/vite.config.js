import babel from "@rollup/plugin-babel";
import path from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    target: 'esnext',
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
  },
  esbuild: {
    target: 'es2022'
  },
  plugins: [
    tsconfigPaths()
  ]
});
