import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectsRoot = '../packages';

/**
 * Sequentially runs `tsc --noEmit` in every package found under `../packages`,
 * performing a type-check without emitting any output files.
 *
 * Packages are processed in the order returned by the filesystem.
 * If TypeScript compilation fails for any package, the error is re-thrown
 * and the remaining packages are **not** processed.
 *
 * @throws If `tsc --noEmit` exits with a non-zero code for any package.
 *
 * @example
 * // Typical output on success:
 * // ▶ Build: @xaendar/core
 * // ✅ @xaendar/core completato
 * // ▶ Build: @xaendar/ui
 * // ✅ @xaendar/ui completato
 *
 * // Typical output on failure:
 * // ▶ Build: @xaendar/core
 * // ❌ Typescript Compilation failed for @xaendar/core:
 */
async function compileAll(): Promise<void> {
  for (const project of readdirSync(projectsRoot)) {
    const projectPath = resolve(projectsRoot, project);
    const tsconfigPath = resolve(projectPath, 'tsconfig.compile.json');
    if (!existsSync(tsconfigPath)) {
      console.error(`❌  Error: @xaendar/${project}: no tsconfig.compile.json found\nPath: ${tsconfigPath}`);
      process.exit(1);
    }

    console.log(`▶ Compile: @xaendar/${project}`);

    try {
      execSync(`tsc --noEmit --project ${tsconfigPath}`, { stdio: 'inherit', cwd: projectPath });
      console.log(`✅ @xaendar/${project} completato`);
    } catch (err) {
      console.error(`❌ Typescript Compilation failed for @xaendar/${project}:`);
      throw err;
    }
  }
}

compileAll();