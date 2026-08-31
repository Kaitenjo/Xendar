import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build as tsupBuild } from 'tsup';
import { XaendarPackageJson } from '../types/xaendar-package-json.type.js';

/**
 * Options for building an extension package and its embedded language server.
 */
export type BuildExtensionProjectOptions = {
  /**
   * Package folder name (for example, `vscode-client`).
   */
  projectName: string;

  /**
   * Absolute or workspace-relative path to the extension package root.
   */
  projectPath: string;

  /**
   * Parsed package configuration.
   */
  pkg: XaendarPackageJson;

  /**
   * Path to the root TypeScript configuration used by tsup.
   */
  tsconfigPath: string;

  /**
   * Enables watch mode for extension and language-server builds.
   * Defaults to `false`.
   */
  watch?: boolean;

  /**
   * Watch patterns for the extension client build.
   */
  extensionWatchPatterns?: string[];

  /**
   * Watch patterns for the language-server build.
   */
  serverWatchPatterns?: string[];
};

/**
 * Builds a VS Code extension package and its bundled language server.
 *
 * @param options Build options for extension and server targets.
 */
export async function buildExtensionProject(options: BuildExtensionProjectOptions): Promise<void> {
  const {
    projectName,
    projectPath,
    pkg,
    tsconfigPath,
    watch = false,
    extensionWatchPatterns,
    serverWatchPatterns,
  } = options;

  const entry = pkg.xaendar?.entry ?? 'src/public-api.ts';
  const outDir = resolve(projectPath, '../../dist/@xaendar', projectName);
  const distDir = resolve(outDir, 'dist');
  const entryPath = resolve(projectPath, entry).replace(/\\/g, '/');

  await tsupBuild({
    entry: {
      [projectName]: entryPath
    },
    outDir: distDir,
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    bundle: true,
    external: ['vscode'],
    dts: false,
    sourcemap: true,
    minify: false,
    clean: true,
    watch: watch ? extensionWatchPatterns : undefined,
    tsconfig: tsconfigPath,
  });

  writePackageJsonForExtensionProject(projectName, projectPath, pkg, outDir);

  await buildLanguageServerInto(resolve(projectPath, '../language-server'), resolve(outDir, 'server'), {
    tsconfigPath,
    watch,
    watchPatterns: serverWatchPatterns,
  });
}

/**
 * Builds the language server bundle into the provided output directory.
 *
 * @param serverProjectPath Language-server package root.
 * @param serverOutDir Destination directory for the compiled server.
 * @param options Build options for server target.
 */
async function buildLanguageServerInto(
  serverProjectPath: string,
  serverOutDir: string,
  options: {
    tsconfigPath: string;
    watch: boolean;
    watchPatterns?: string[];
  }
): Promise<void> {
  const serverEntry = resolve(serverProjectPath, 'src/lib/server.ts');

  await tsupBuild({
    entry: { server: serverEntry },
    outDir: serverOutDir,
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    bundle: true,
    external: ['vscode'],
    dts: false,
    sourcemap: true,
    clean: true,
    watch: options.watch ? options.watchPatterns : undefined,
    tsconfig: options.tsconfigPath,
  });
}

/**
 * Writes extension `package.json` and copies `language.json` into output.
 *
 * @param projectName Extension package folder name.
 * @param projectPath Extension package root path.
 * @param pkg Parsed source package metadata.
 * @param outDir Destination package directory under `dist`.
 */
function writePackageJsonForExtensionProject(projectName: string, projectPath: string, pkg: XaendarPackageJson, outDir: string): void {
  const distPkg = {
    name: pkg.name!,
    version: pkg.version!,
    description: pkg.description ?? '',
    author: pkg.author ?? '',
    license: pkg.license ?? 'MIT',
    type: 'module',
    publisher: 'xaendar',
    engines: {
      vscode: '^1.90.0'
    },
    categories: ['Programming Languages', 'Linters'],
    activationEvents: [
      'workspaceContains:**/*.xd.component.html'
    ],
    main: `./dist/${projectName}.cjs`,
    contributes: {
      languages: [
        {
          id: 'xaendar-html',
          extensions: ['.xd.component.html'],
          aliases: ['Xaendar Template']
        }
      ],
      grammars: [
        {
          language: 'xaendar-html',
          scopeName: 'xaendar.injection',
          path: './language.json'
        }
      ]
    },
  };

  mkdirSync(outDir, { recursive: true });
  const packageJsonPath = resolve(outDir, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify(distPkg, null, 2), 'utf-8');

  const languageJsonPath = resolve(projectPath, 'language.json');
  const languageJson = readFileSync(languageJsonPath, 'utf-8');
  writeFileSync(resolve(outDir, 'language.json'), languageJson);
}
