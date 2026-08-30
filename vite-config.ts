import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PackageJson } from "type-fest";
import { PluginOption, UserConfig } from "vite";
import dts from 'vite-plugin-dts';

export type ViteConfigOptions = {
  plugins?: PluginOption[],
  secondaryEntryPoints?: Record<string, string>
}

const external = [
  '@xaendar/common',
  '@xaendar/compiler',
  '@xaendar/core',
  '@xaendar/signals',
  '@xaendar/types',
  "typescript"
]

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
        fileName: (format, entryName) => `${entryName}.${format}.js`,
        formats: ['es']
      },
      outDir: distDir,
      emptyOutDir: true,
      rollupOptions: {
        external
      },
      minify: false,
      sourcemap: false
    },
    logLevel: 'info',
    plugins: [
      {
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
            main: `./dist/${fileName}.es.js`,
            module: `./dist/${fileName}.es.js`,
            types: `./dist/${fileName}.d.ts`,
            exports: {
              ".": {
                import: {
                  types: `./dist/${fileName}.d.ts`,
                  default: `./dist/${fileName}.es.js`
                }
              },
              ...(Object.keys(secondaryEntryPoints).reduce<PackageJson.ExportConditions>((acc, entryPoint) => {
                acc[entryPoint] = {
                  import: {
                    types: `./dist/${entryPoint}.d.ts`,
                    default: `./dist/${entryPoint}.es.js`
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
      },
      {
        name: 'copy-readme',
        writeBundle() {
          const readmePath = resolve(dirName, 'README.md');
          if (existsSync(readmePath)) {
            copyFileSync(readmePath, resolve(outDir, 'README.md'));
          }
        }
      },
      dts({
        // This path depends on the root value below
        exclude: ['../../../**/*.spec.ts'],
        include: ['../../../**/*.ts'],
        insertTypesEntry: true,
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