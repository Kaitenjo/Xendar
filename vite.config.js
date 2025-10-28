import { defineConfig } from 'vite';
import babel from "@rollup/plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

const external = [
  '@xendar/common',
  '@xendar/core',
  '@xendar/components'
]

export default defineConfig({
  root: './src',
  esbuild: {
    target: 'esnext',
  },
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: './src/index.html'
    },
    external
  },
  server: {
    open: true
  },
  esbuild: {
    target: 'esnext'
  },
  plugins: [
    tsconfigPaths(),
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