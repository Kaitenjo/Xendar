import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PackageJson } from "type-fest";
import { PluginOption, UserConfig } from "vite";
import dts from 'vite-plugin-dts';

export type ViteConfigOptions = {
  plugins?: PluginOption[]
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
  const fileName = name.split('/').join('-').slice(1);
  const outDir = resolve(dirName, `../../dist/${name}`);
  const distDir = join(outDir, 'dist');

  return {
    build: {
      target: 'esnext',
      lib: {
        entry: resolve(dirName, 'src/public-api.ts'),
        name,
        fileName: format => `${fileName}.${format}.js`,
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
            types: `./dist/${fileName}.es.d.ts`,
            exports: {
              ".": {
                import: {
                  types: `./dist/${fileName}.es.d.ts`,
                  default: `./dist/${fileName}.es.js`
                }
              }
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
        rollupTypes: true,
        outDir: distDir,
        root: resolve(dirName, 'src/public-api.ts'),
        afterBuild() {
          const typesPath = resolve(distDir, `${fileName}.es.d.ts`);
          const content = readFileSync(typesPath, 'utf-8');
          const result = content.replace(/from ['"](?:\.\.\/)*schematics\/packages\/([^/]+)\/src\/public-api['"]/g, (_, pkg) => `from '@xaendar/${pkg}'`);
          writeFileSync(typesPath, result);
        }
      }),
      ...(options?.plugins ?? [])
    ],
  };
}