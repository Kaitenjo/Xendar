/**
 * Generates the content of the project `vite.config.ts`.
 *
 * @returns The formatted TypeScript source string.
 */
export function viteConfigTs(): string {
  return `import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  server: {
    open: true,
    port: 4200
  }
});`;
}
