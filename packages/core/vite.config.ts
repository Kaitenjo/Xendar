import { defineConfig } from 'vite';
import getViteConfig from '../../vite-config.js';

export default defineConfig(getViteConfig('@xaendar/core', import.meta.dirname, { secondaryEntryPoints:  { signals: 'src/signals/index.ts' }}));
