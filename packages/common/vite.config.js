import path from 'path';
import { defineConfig } from 'vite';

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
      }
    }
  },
  esbuild: {
    target: 'esnext'
  },
  plugins: [
    babel({
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      babelHelpers: "bundled",
      include: ["src/**/*"],
      plugins: [
        ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ["@babel/plugin-transform-class-static-blocks", { loose: false }],
        ["@babel/plugin-proposal-class-properties", { loose: false }],
        ["@babel/plugin-proposal-private-methods", { loose: false }],
      ]
    })
  ]
});
