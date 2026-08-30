import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import getViteConfig from '../../vite-config.js';

export default defineConfig(getViteConfig('@xaendar/signals', import.meta.dirname, {
  plugins: [
    {
      name: 'types',
      writeBundle() {
        const pathDeclaration = '../dist/@xaendar/signals/dist/xaendar-signals.d.ts';
        const content = readFileSync('../packages/signals/src/globals.d.ts', 'utf-8');
        const dtsContent = readFileSync(pathDeclaration, 'utf-8');
        writeFileSync(pathDeclaration, `${content}\n\n${dtsContent}`);
      }
    }
  ]
}));
