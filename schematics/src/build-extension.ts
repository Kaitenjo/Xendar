import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'tsup';
import { PackageJson } from 'type-fest';

type XaendarTarget = 'browser' | 'node' | 'extension';

type XaendarPackageJson = PackageJson & {
  /**
   * Custom field used to configure the build process for each package. It specifies
   */
  xaendar?: {
    /**
     * The intended runtime environment for the package, which determines the build tool and output format. Defaults to `browser`.
     */
    target: XaendarTarget;
    /** 
     * Entry point relative to the package root. Defaults to `src/public-api.ts`. 
     */
    entry?: string;
    /** 
     * Whether to emit `.d.ts` declaration files. Defaults to `true`. 
     */
    dts?: boolean;
    /**
     * Whether to build this package. Set to `false` for internal packages
     * that are bundled inline by their consumer (e.g. compiler bundled into CLI).
     */
    build?: boolean;
    /**
     * If `true`, all dependencies are bundled inline (not externalized).
     * Used for CLI executables that should be self-contained.
     */
    noExternal?: boolean;
    /**
     * Whether to generate source maps for the output files. Defaults to `true`.
     */
    sourceMap?: boolean;
  };
};

async function buildExtension(projectName: string, projectPath: string, pkg: XaendarPackageJson): Promise<void> {
  const entry = pkg.xaendar?.entry ?? 'src/public-api.ts';
  const outDir = resolve(projectPath, '../../dist/@xaendar', projectName);
  const distDir = resolve(outDir, 'dist');
  const entryPath = resolve(projectPath, entry).replace(/\\/g, '/');

  const distPkg = {
    name: pkg.name!,
    version: pkg.version!,
    description: pkg.description ?? '',
    author: pkg.author ?? '',
    license: pkg.license ?? 'MIT',
    type: 'module',
    publisher: "xaendar",
    engines: {
      vscode: "^1.90.0"
    },
    categories: ["Programming Languages", "Linters"],
    activationEvents: [
      "workspaceContains:**/*.xd.component.html"
    ],
    main: `./dist/${projectName}.cjs`,
    contributes: {
      languages: [
        {
          id: "xaendar-html",
          extensions: [".xd.component.html"],
          aliases: ["Xaendar Template"]
        }
      ],
      grammars: [
        {
          language: "xaendar-html",
          scopeName: "xaendar.injection",
          path: "./language.json"
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

  await build({
    entry: { [projectName]: entryPath },
    outDir: distDir,
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    bundle: true,
    external: ['vscode'],
    dts: false,
    sourcemap: true,
    minify: false,
    clean: false,
    watch: ['../packages/vscode-client/**/*.ts'],
    tsconfig: '../tsconfig.json',
  });

  const serverOutDir = resolve(outDir, 'server');
  const serverEntry = resolve(projectPath, '../language-server', 'src/lib/server.ts');

  await build({
    entry: { server: serverEntry },
    outDir: serverOutDir,
    format: ['cjs'],
    platform: 'node',
    target: 'node18',
    bundle: true,
    dts: false,
    sourcemap: true,
    clean: false,
    watch: ['../packages/language-server/**/*.ts'],
    tsconfig: '../tsconfig.json'
  });
}
buildExtension('vscode-client', '../packages/vscode-client', JSON.parse(readFileSync('../packages/vscode-client/package.json', { encoding: 'utf-8' })));
