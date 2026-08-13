import { exec } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Packs all built packages found under `../dist/@xaendar` into `.tgz` tarballs
 * and places them in `../output`.
 *
 * For each package, runs `npm pack --pack-destination ../../../output` in its
 * build directory. The `../output` folder is created automatically if it does
 * not exist.
 *
 * @returns {void}
 *
 * @remarks
 * - Uses the asynchronous {@link exec} without awaiting the result, so the
 *   success log (`✅`) is printed optimistically before the command completes.
 *   Errors thrown asynchronously by `exec` will therefore be unhandled.
 *   Consider switching to {@link execSync} or promisifying `exec` if you need
 *   reliable error handling.
 * - The shell is hardcoded to `cmd.exe`, making this script **Windows-only**.
 *
 * @example
 * // ../dist/@xaendar/ contains: core/, ui/
 * // After running:
 * // ../output/
 * //   xaendar-core-1.0.0.tgz
 */
function packAll(): void {
  const outputPath = '../output';
  const buildPackagesPath = '../dist/@xaendar';


  if (existsSync(outputPath)) {
    rmSync(outputPath, { recursive: true, force: true });
  }

  mkdirSync(outputPath);

  const projects = readdirSync(buildPackagesPath);

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const projectPath = resolve(buildPackagesPath, project);

    console.log(`\n▶ Pack: ${project}`);

    try {
      exec('npm pack --pack-destination ../../../output', {
        cwd: projectPath,
        shell: 'C:\\Windows\\System32\\cmd.exe',
      });
      console.log(`✅ ${project} completato`);
    } catch (err) {
      const error = err as Error
      console.error(`❌ ${project} fallito:`, error.message);
    }
  }
}

packAll();