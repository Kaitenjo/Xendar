import { readFileSync } from 'node:fs';
import { buildExtensionProject } from './lib/build-extension.js';
import { XaendarPackageJson } from './types/xaendar-package-json.type.js';

/**
 * Builds the `vscode-client` extension in watch mode.
 */
async function runBuildExtension(): Promise<void> {
  const projectName = 'vscode-client';
  const projectPath = '../packages/vscode-client';
  const pkg: XaendarPackageJson = JSON.parse(readFileSync('../packages/vscode-client/package.json', { encoding: 'utf-8' }));

  await buildExtensionProject({
    projectName,
    projectPath,
    pkg,
    tsconfigPath: '../tsconfig.json',
    watch: true,
    extensionWatchPatterns: ['../packages/vscode-client/**/*.ts'],
    serverWatchPatterns: ['../packages/language-server/**/*.ts'],
  });
}

runBuildExtension().catch((err: Error) => {
  console.error('❌ build-extension fallito:', err.message);
  process.exit(1);
});
