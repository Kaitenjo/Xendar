import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PackageJson } from 'type-fest';

/**
 * Represents a semantic version following the SemVer specification (major.minor.patch).
 *
 * @example
 * const v = new Version('1.2.3');
 * console.log(v.major); // 1
 * console.log(v.toString()); // '1.2.3'
 */
export class Version {
  /**
   * The major version number. Incremented on breaking changes.
   */
  public major = 0;
  /**
   * The minor version number. Incremented on backwards-compatible new features.
   */
  public minor = 0;
  /**
   * The patch version number. Incremented on backwards-compatible bug fixes.
   */
  public patch = 0;

  /**
   * Creates a Version instance by parsing a SemVer string.
   *
   * @param version - A version string in the format `'major.minor.patch'`.
   *                  Missing components default to `0`.
   *
   * @example
   * new Version('2.0.0'); // major=2, minor=0, patch=0
   * new Version('1.4');   // major=1, minor=4, patch=0
   */
  constructor(version: string) {
    const [major, minor, patch] = version.split('.').map(Number);
    if (major !== undefined) {
      this.major = major;
      this.minor = minor ?? 0;
      this.patch = patch ?? 0;
    }
  }

  /**
   * Returns the version as a SemVer-formatted string.
   *
   * @returns A string in the format `'major.minor.patch'`.
   *
   * @example
   * new Version('3.1.4').toString(); // '3.1.4'
   */
  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}

/**
 * Bumps the version of the root `package.json` and all packages under `../packages/`,
 * according to the specified bump type.
 *
 * - `major`: Resets minor and patch to 0, increments major (e.g. 1.2.3 → 2.0.0).
 * - `minor`: Resets patch to 0, increments minor (e.g. 1.2.3 → 1.3.0).
 * - `patch`: Increments patch only (e.g. 1.2.3 → 1.2.4).
 *
 * @param bump - The version component to increment: `'major'`, `'minor'`, or `'patch'`.
 *
 * @throws Will throw if `../package.json` or any sub-package JSON cannot be read or written.
 *
 * @example
 * updateVersion('patch'); // bumps patch across all packages
 */
function updateVersion(bump: 'major' | 'minor' | 'patch'): void {
  console.log(`\nStarting version bump: [${bump.toUpperCase()}]\n`);

  const mainPackageJsonPath = '../package.json';
  const mainPackageJson: PackageJson = JSON.parse(readFileSync(mainPackageJsonPath, { encoding: 'utf-8' }));

  const previousVersion = mainPackageJson.version!;
  const version = new Version(previousVersion);

  switch (bump) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      break;

    case 'minor':
      version.minor++;
      version.patch = 0;
      break;

    case 'patch':
      version.patch++;
      break;
  }

  const nextVersion = version.toString();
  console.log(`Root package: ${previousVersion} → ${nextVersion}`);

  writeFileSync(mainPackageJsonPath, JSON.stringify({ ...mainPackageJson, version: nextVersion }, null, 2));
  console.log(`✅ Written: ${mainPackageJsonPath}`);

  const packages = readdirSync('../packages');
  console.log(`\nFound ${packages.length} sub-package(s) to update...\n`);

  for (let i = 0; i < packages.length; i++) {
    const projectName = packages[i];
    const packageJsonPath = `../packages/${projectName}/package.json`;
    const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, { encoding: 'utf-8' }));

    const prevSub = packageJson.version ?? 'unknown';
    if (packageJson.dependencies) {
      for (const depName in packageJson.dependencies) {
        if (depName.startsWith('@xaendar')) {
          packageJson.dependencies[depName] = nextVersion;
        }
      }
    }

    writeFileSync(packageJsonPath, JSON.stringify({ ...packageJson, version: nextVersion }, null, 2));
    console.log(`✅ ${projectName}: ${prevSub} → ${nextVersion}`);
  }

  console.log(`\nAll packages updated to version ${nextVersion}\n`);
}

/**
 * Parses the `--bump` CLI argument from `process.argv`.
 *
 * Expects a flag in the format `--bump=patch|minor|major`.
 * Exits the process with code `1` if the flag is missing or has an invalid value.
 *
 * @returns The parsed bump type: `'patch'`, `'minor'`, or `'major'`.
 *
 * @example
 * // Called via: node script.js --bump=minor
 * const bump = parseBump(); // 'minor'
 */
function parseBump(): 'patch' | 'minor' | 'major' {
  console.log('Parsing CLI arguments...');

  const arg = process.argv.find((a) => a.startsWith('--bump='));

  if (!arg) {
    console.error(`❌ Missing required argument: --bump\n   Usage: node script.js --bump=patch|minor|major`);
    process.exit(1);
  }

  const value = arg.split('=')[1];
  console.log(`   --bump=${value}`);

  if (value !== 'patch' && value !== 'minor' && value !== 'major') {
    console.error(`❌ Invalid bump value: '${value}'\n   Accepted values: major, minor, patch`);
    process.exit(1);
  }

  return value;
}

const bump = parseBump();
updateVersion(bump);