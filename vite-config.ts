import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PackageJson } from "type-fest";
import { PluginOption, UserConfig } from "vite";
import dts from 'vite-plugin-dts';

/**
 * Options used to extend the shared Vite config.
 */
export type ViteConfigOptions = {
  plugins?: PluginOption[],
  secondaryEntryPoints?: Record<string, string>
}

/**
 * Builds the standard Vite configuration for Xaendar packages.
 *
 * @param name Package name (for example, `@xaendar/core`).
 * @param dirName Absolute path of the package directory.
 * @param options Optional build extensions (plugins and secondary entry points).
 * @returns A reusable Vite user configuration.
 */
export default function getViteConfig(name: string, dirName: string, options?: ViteConfigOptions): UserConfig {
  const fileName = JSON.parse(JSON.stringify(name.split('/').join('-').slice(1)));
  const outDir = resolve(dirName, `../../dist/${name}`);
  const distDir = join(outDir, 'dist');
  const secondaryEntryPoints = options?.secondaryEntryPoints ?? {};

  return {
    build: {
      target: 'esnext',
      lib: {
        entry: {
          [fileName]: resolve(dirName, 'src/public-api.ts'),
          ...(Object.entries(secondaryEntryPoints).reduce<Record<string, string>>((acc, [entryPoint, path]) => {
            acc[entryPoint] = resolve(dirName, path);
            return acc;
          }, {}))
        },
        name,
        fileName: (_, entryName) => `${entryName}.js`,
        formats: ['es']
      },
      outDir: distDir,
      emptyOutDir: true,
      rollupOptions: {
        external: [
          '@xaendar/common',
          '@xaendar/compiler',
          '@xaendar/core',
          '@xaendar/signals',
          '@xaendar/types',
          "typescript"
        ]
      },
      minify: false,
      sourcemap: false
    },
    logLevel: 'info',
    plugins: [
      createGeneratePackageJsonPlugin(dirName, fileName, outDir, secondaryEntryPoints),
      createCopyReadmePlugin(dirName, outDir),
      dts({
        // This path depends on the root value below
        exclude: ['../../../**/*.spec.ts'],
        include: ['../../../**/*.ts'],
        rollupTypes: true,
        outDir: distDir,
        root: resolve(dirName, 'src/public-api.ts'),
        afterBuild() {
          const typesPath = resolve(distDir, `${fileName}.d.ts`);
          const content = readFileSync(typesPath, 'utf-8');
          const result = content.replace(/from ['"](?:\.\.\/)*schematics\/packages\/([^/]+)\/src\/public-api['"]/g, (_, pkg) => `from '@xaendar/${pkg}'`);
          writeFileSync(typesPath, result);
        }
      }),
      ...(options?.plugins ?? [])
    ],
  };
}

/**
 * Creates the plugin that writes the distribution `package.json`.
 *
 * @param dirName Absolute path of the current package directory.
 * @param fileName Output file name derived from the package name.
 * @param outDir Output root directory for the package.
 * @param secondaryEntryPoints Additional export entry points.
 * @returns A Vite plugin that generates `package.json` in the output folder.
 */
function createGeneratePackageJsonPlugin(dirName: string, fileName: string, outDir: string, secondaryEntryPoints: Record<string, string>): PluginOption {
  return {
    name: 'generate-package-json',
    writeBundle() {
      const pkgPath = resolve(dirName, 'package.json');
      const pkg: PackageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      const distPkg = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        sideEffects: false,
        type: "module",
        main: `./dist/${fileName}.js`,
        module: `./dist/${fileName}.js`,
        types: `./dist/${fileName}.d.ts`,
        exports: {
          ".": {
            import: {
              types: `./dist/${fileName}.d.ts`,
              default: `./dist/${fileName}.js`
            }
          },
          ...(Object.keys(secondaryEntryPoints).reduce<PackageJson.ExportConditions>((acc, entryPoint) => {
            acc[`./${entryPoint}`] = {
              import: {
                types: `./dist/${entryPoint}.d.ts`,
                default: `./dist/${entryPoint}.js`
              }
            }
            return acc;
          }, {}))
        },
        ...(Object.keys(pkg.peerDependencies ?? {}).length ? { peerDependencies: pkg.peerDependencies } : {}),
        ...(Object.keys(pkg.dependencies ?? {}).length ? { dependencies: pkg.dependencies } : {}),
      };

      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'package.json'), JSON.stringify(distPkg, null, 2));
    }
  };
}

/**
 * Creates the plugin that copies package `README.md` to the output folder.
 *
 * @param dirName Absolute path of the current package directory.
 * @param outDir Output root directory for the package.
 * @returns A Vite plugin that copies `README.md` if present.
 */
function createCopyReadmePlugin(dirName: string, outDir: string): PluginOption {
  return {
    name: 'copy-readme',
    writeBundle() {
      const readmePath = resolve(dirName, 'README.md');
      if (existsSync(readmePath)) {
        copyFileSync(readmePath, resolve(outDir, 'README.md'));
      }
    }
  };
}