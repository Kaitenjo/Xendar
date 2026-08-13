import { execSync } from 'child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Base path to the distribution folder containing all scoped packages.
 * This script runs from the `schematics` directory, so we go up one level
 * to reach the monorepo root, then into `dist/@xaendar`.
 */
const DIST_FOLDER = '../dist/@xaendar';

/**
 * Verifies that the current environment is authenticated with npm.
 *
 * Runs `npm whoami` to check for a valid session or token.
 * Exits the process with code `1` if authentication fails.
 *
 * @example
 * checkAuth(); // logs "Logged in as: yourname" or exits with an error
 */
function checkAuth(): void {
  try {
    const user = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
    console.log(`✅ Logged in as: ${user}`);
  } catch {
    console.error('❌ You are not logged in to npm. Please run:');
    console.error('   npm login');
    console.error('   or set NPM_TOKEN in your environment');
    process.exit(1);
  }
}

/**
 * Publishes all packages found in {@link DIST_FOLDER} to the npm registry.
 *
 * Iterates over every subdirectory of the dist folder, treating each as a
 * scoped `@xaendar/*` package, and runs `npm publish --access public` inside it.
 *
 * Exits the process with code `1` if any package fails to publish.
 *
 * @returns A promise that resolves when all packages have been published successfully.
 *
 * @example
 * await publishAll();
 * // Publishes @xaendar/core, @xaendar/utils, etc.
 */
async function publishAll(): Promise<void> {
  const packages = readdirSync(DIST_FOLDER);
  console.log(`\n📦 Publishing ${packages.length} @xaendar package(s)...\n`);

  for (let i = 0; i < packages.length; i++) {
    const project = packages[i];
    const projectPath = resolve(DIST_FOLDER, project);
    console.log(`🚀 Publishing @xaendar/${project}...`);

    try {
      execSync('npm publish --access public', { stdio: 'inherit', cwd: projectPath });
      console.log(`✅ @xaendar/${project} published successfully\n`);
    } catch (err) {
      const error = err as Error;
      console.error(`❌ Failed to publish @xaendar/${project}:`, error.message);
      process.exit(1);
    }
  }

  console.log('🎉 All packages published successfully!');
}

checkAuth();
publishAll();