import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build as tsupBuild } from 'tsup';
import { PackageJson, TsConfigJson } from 'type-fest';
import { build as viteBuild } from 'vite';

const projectsPath = '../packages';

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
    executable?: boolean;
    /**
     * Whether to generate source maps for the output files. Defaults to `true`.
     */
    sourceMap?: boolean;
  };
};

/**
 * Reads and parses the `package.json` of a given package folder.
 */
function getPackageJson(projectName: string): XaendarPackageJson {
  return JSON.parse(readFileSync(resolve(projectsPath, projectName, 'package.json'), { encoding: 'utf-8' }));
}

/**
 * Scans the `../packages` directory and builds a map associating each project
 * with its `@xaendar`-scoped dependencies.
 *
 * @returns A map of `projectName → { "@xaendar/pkg": "version" }`.
 */
function mapProjectsDependencies(): Map<string, Record<string, string>> {
  return new Map(
    readdirSync(projectsPath)
      .reduce<[string, Record<string, string>][]>((acc, folder) => {
        try {
          const pkg = getPackageJson(folder);
          const dependencies = pkg.dependencies ?? {};

          const xaendarDependencies = Object.entries(dependencies)
            .filter(([name]) => name.includes('@xaendar'))
            .reduce<Record<string, string>>((deps, [name, version]) => {
              deps[name] = version!;
              return deps;
            }, {});

          acc.push([folder, xaendarDependencies]);
          return acc;
        } catch {
          console.warn(`Error while reading package.json for project ${folder}`);
          process.exit(1);
        }
      }, [])
  );
}

/**
 * Starts the build for all projects with no pending `@xaendar` dependencies.
 */
function buildProjects(projects: Map<string, Record<string, string>>): void {
  Array.from(projects.entries())
    .filter(([, deps]) => Object.keys(deps).length === 0)
    .forEach(([name]) => buildProject(name));
}

/**
 * Builds a single package using Vite (browser) or tsup (node), based on the
 * `xaendar.target` field in its `package.json`.
 *
 * After a successful build, any dependent project that was waiting on this one
 * has the dependency removed; if the dependent has no more pending deps, its
 * build is triggered immediately.
 *
 * @param projectName - The folder name of the project (e.g. `"compiler"`).
 */
function buildProject(projectName: string): void {
  const projectPath = resolve(projectsPath, projectName);
  const pkg = getPackageJson(projectName);

  // Skip packages that are not meant to be built independently
  if (pkg.xaendar?.build === false) {
    console.log(`⏭️  Skip: @xaendar/${projectName} (bundled by consumer)`);
    markComplete(projectName);
    return;
  }

  const target = pkg.xaendar?.target ?? 'browser';

  console.log(`\n▶ Build [${target}]: @xaendar/${projectName}`);

  const onSuccess = () => {
    console.log(`✅ @xaendar/${projectName} completato`);
    markComplete(projectName);
  };

  const onError = (err: Error) => console.error(`❌ @xaendar/${projectName} fallito:`, err.message);

  let buildPromise: Promise<void> | ReturnType<typeof viteBuild>;

  try {
    switch (target) {
      case 'browser':
        buildPromise = buildBrowser(projectPath);
        break;
      case 'node':
        buildPromise = buildNode(projectName, projectPath, pkg);
        break;
      case 'extension':
        buildPromise = buildExtension(projectName, projectPath, pkg);
        break;
    }

    buildPromise.then(onSuccess).catch(onError);
  } catch (err) {
    onError(err as Error);
  }
}

/**
 * Builds a browser package using Vite.
 */
function buildBrowser(projectPath: string): ReturnType<typeof viteBuild> {
  return viteBuild({
    root: projectPath,
    configFile: resolve(projectPath, 'vite.config.ts'),
  });
}

/**
 * Builds a Node package using tsup.
 *
 * - Entry point: `xaendar.entry` from package.json, defaults to `src/public-api.ts`.
 * - Output: `dist/@xaendar/{projectName}` in the workspace root.
 * - If `noExternal` is set, all dependencies are bundled inline (self-contained executable).
 * - Declaration files are emitted unless `xaendar.dts` is explicitly `false`.
 */
async function buildNode(projectName: string, projectPath: string, pkg: XaendarPackageJson): Promise<void> {
  const entry = pkg.xaendar?.entry ?? 'src/public-api.ts';
  const outDir = resolve(projectPath, '../../dist/@xaendar', projectName);
  const distDir = resolve(outDir, 'dist');
  const entryPath = resolve(projectPath, entry).replace(/\\/g, '/');

  let dts: Parameters<typeof tsupBuild>[0]['dts'] = false;
  let types: { types: string } | object = {};

  if (pkg.xaendar?.dts) {
    const mainTsConfigPath = resolve(projectsPath, '../tsconfig.json');
    const mainTsConfig: TsConfigJson = JSON.parse(readFileSync(mainTsConfigPath, 'utf-8'));

    dts = {
      compilerOptions: {
        ignoreDeprecations: '6.0',
        rootDir: resolve(projectPath, '../..'),
        paths: Object.entries(mainTsConfig.compilerOptions!.paths!).reduce<Record<string, string[]>>((acc, [key, paths]) => {
          acc[key] = paths.map(p => resolve(projectPath, '../..', `${p}.ts`).replace(/\\/g, '/'));
          return acc;
        }, {}),
        types: ['*']
      }
    };

    types = {
      types: `./dist/${projectName}.d.ts`
    };
  }

  await tsupBuild({
    entry: {
      [projectName]: entryPath
    },
    minify: true,
    outDir: distDir,
    format: ['esm'],
    dts,
    sourcemap: false,
    clean: true,
    external: pkg.dependencies ? Object.keys(pkg.dependencies) : undefined,
    tsconfig: resolve(projectsPath, '../tsconfig.json')
  });
  return writePackageJsonForNodeProject(projectName, pkg, { types, outDir });
}

function writePackageJsonForNodeProject(projectName: string, pkg: XaendarPackageJson, options: { types: { types: string } | object, outDir: string }): void {
  const executable = pkg.xaendar?.executable === true;
  let bin: Record<string, unknown> = {};
  if (executable) {
    bin = {
      bin: {
        xd: `./dist/${projectName}.js`,
      }
    }
  }

  const distPkg = {
    name: pkg.name!,
    version: pkg.version!,
    description: pkg.description ?? '',
    author: pkg.author ?? '',
    license: pkg.license ?? 'MIT',
    type: 'module',
    ...bin,
    exports: {
      '.': {
        ...options.types,
        import: `./dist/${projectName}.js`,
        require: `./dist/${projectName}.js`
      }
    },
    main: `./dist/${projectName}.js`,
    ...options.types,
    dependencies: pkg.dependencies
  };

  mkdirSync(options.outDir, { recursive: true });

  const packageJsonPath = resolve(options.outDir, 'package.json');
  writeFileSync(packageJsonPath, JSON.stringify(distPkg, null, 2), 'utf-8');
}

async function buildExtension(projectName: string, projectPath: string, pkg: XaendarPackageJson): Promise<void> {
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
    tsconfig: resolve(projectsPath, '../tsconfig.json'),
  });
  writePackageJsonForExtensionProject(projectName, projectPath, pkg, outDir);
  await buildLanguageServerInto(resolve(projectPath, '../language-server'), resolve(outDir, 'server'));
}

async function buildLanguageServerInto(serverProjectPath: string, serverOutDir: string): Promise<void> {
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
    tsconfig: resolve(projectsPath, '../tsconfig.json'),
  });
}

function writePackageJsonForExtensionProject(projectName: string, projectPath: string, pkg: XaendarPackageJson, outDir: string): void {
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
}

/**
 * Marks a project as complete and triggers dependents whose deps are now satisfied.
 */
function markComplete(projectName: string): void {
  projects.delete(projectName);

  Array.from(projects.entries()).forEach(([dependentName, deps]) => {
    if (`@xaendar/${projectName}` in deps) {
      delete deps[`@xaendar/${projectName}`];
      if (Object.keys(deps).length === 0) {
        buildProject(dependentName);
      }
    }
  });
}

const projects = mapProjectsDependencies();
buildProjects(projects);
