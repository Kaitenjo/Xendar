import depcheck from 'depcheck';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PackageJson } from "type-fest";

/**
 * Default options passed to `depcheck` for every scanned package.
 *
 * - `ignoreDirs` – directories that are not analysed (assets, stories, tests, etc.).
 * - `ignoreMatches` – package names that are always considered used even if not detected.
 * - `ignorePatterns` – file glob patterns excluded from the scan.
 * - `detectors` – only `require()` calls and ES `import` declarations are considered.
 */
const deepCheckOptions = {
  ignoreDirs: [
    'resources',
    'cultures',
    'stories',
    'testing'
  ],
  ignoreMatches: [
    'json-schema'
  ],
  ignorePatterns: [
    '*.json',
    '*.spec.ts',
    '*.js',
    '*.scss',
    '*.html',
    'vite.config.ts',
  ],
  detectors: [
    depcheck.detector.requireCallExpression,
    depcheck.detector.importDeclaration,
  ]
};

/**
 * Entry point. Iterates over every package in `../packages`, runs `depcheck`
 * on each one, and validates the following rules:
 *
 * 1. **No invalid files** – files that depcheck could not parse are reported.
 * 2. **No unused  dependencies** – every entry in `dependencies` must
 *    appear at least once in the source code.
 * 3. **No self-dependency** – a package must not import itself, either in the
 *    source code or in its own `dependencies`.
 * 4. **No missing  dependencies** – every import that is not already
 *    declared must be added to `dependencies`, with the version taken from
 *    the root `package.json` (or the package's own version for `@xaendar` deps).
 *
 * Exits with code `1` if any violation is found, `0` otherwise.
 *
 * @returns
 */
async function checkDependencies(): Promise<void> {
  let hasError = false;
  const projectPaths = getProjectPaths();
  const mainPackageJsonDependencies = getMainPackageJsonDependencies();

  for (let i = 0; i < projectPaths.length; i++) {
    const projectPath = projectPaths[i];
    const packageJson = getPackageJson(projectPath);
    const depCheckResult = await depcheck(projectPath, deepCheckOptions);

    // Rule 1 – invalid files
    const realAllInvalidFiles = Object.keys(depCheckResult.invalidFiles);
    if (realAllInvalidFiles.length) {
      console.log(['Package', packageJson.name, 'invalid files!']);
      console.log([depCheckResult.invalidFiles]);
      hasError = true;
    }

    // Rule 2 – self-dependency in source code
    const realAllDependenciesUsedNames = Object.keys(depCheckResult.using);
    const selfDepOnSourceCode = realAllDependenciesUsedNames.findIndex(d => d === packageJson.name);
    if (selfDepOnSourceCode > -1) {
      console.log(['package', packageJson.name, 'has a self dep, remove it']);
      hasError = true;
    }

    if (hasError) {
      console.error('Error on dependencies check!!!');
      process.exit(1);
    }

    // Rule 3 – unused dependencies
    const dependenciesNames = packageJson.dependencies ? Object.keys(packageJson.dependencies) : undefined;
    if (dependenciesNames?.length) {
      dependenciesNames
        .filter(depName => realAllDependenciesUsedNames.indexOf(depName) < 0)
        .forEach(depName => {
          console.log([`Package ${packageJson.name} import unused library ${depName}\nIt will be removed automatically`]);
          delete packageJson.dependencies![depName]
        });
    }

    // Rule 4 – missing dependencies
    const missingDepsNames = Object.keys(depCheckResult.missing);
    if (missingDepsNames.length) {
      missingDepsNames.forEach(depName => {
        const version = depName.includes('@xaendar') ? mainPackageJsonDependencies.self : mainPackageJsonDependencies[depName];

        /*
          This branch checks if a package uses a dependency not declared in the root `package.json`. 
          This should never happen, but check just in case, to avoid adding undeclared dependencies by mistake.
        */
        if (!version) {
          console.error(`Package ${packageJson.name} is missing dependency ${depName}, but it was not found in the root package.json. Please add it manually.`);
          process.exit(1);
        }

        console.log(`Package ${packageJson.name} is missing dependency ${depName}@${version}\nIt will be added automatically`);

        /*
          If the missing dependency is the first dependency of the package, the dependencies field might be undefined, 
          so we need to initialize it before adding the new dependency.
        */
        packageJson.dependencies ??= {};
        packageJson.dependencies![depName] = version
      });
    }

    // Rule 5 - Update depedencies if main package.json has a different version for an already declared dependency
    const dependencies = packageJson.dependencies;
    const dependenciesEntries = dependencies ? Object.entries(dependencies) : undefined;
    if (dependenciesEntries?.length) {
      dependenciesEntries.forEach(([depName, depVersion]) => {
        const mainVersion = depName.includes('@xaendar') ? mainPackageJsonDependencies.self : mainPackageJsonDependencies[depName];

        /*
          This branch checks if a package uses a dependency not declared in the root `package.json`. 
          This should never happen, but check just in case, to avoid adding undeclared dependencies by mistake.
        */
        if (!mainVersion) {
          console.error(`Dependency ${depName} declared in ${packageJson.name} package.json is not declared in the root package.json`);
          process.exit(1);
        }

        if (mainVersion !== depVersion) {
          console.log(`Package ${packageJson.name} has a different version for dependency ${depName} (${depVersion}) than the root package.json (${mainVersion})\nIt will be updated automatically`);
          dependencies![depName] = mainVersion;
        }
      });
    }

    writeFileSync(`${projectPath}/package.json`, JSON.stringify(packageJson, null, 2));
  }
}

/**
 * Returns the absolute paths of all packages inside `../packages`.
 *
 * @returns An array of absolute directory paths, one per package.
 *
 * @example
 * getProjectPaths();
 * // ['/repo/packages/core', '/repo/packages/ui', ...]
 */
function getProjectPaths(): string[] {
  const packagesDir = resolve('..', 'packages');
  return readdirSync(packagesDir).map(project => join(packagesDir, project));
}

/**
 * Reads and parses the `package.json` of the given project.
 *
 * Pass an empty string to read the root `package.json`
 * (i.e. the one located at the current working directory).
 *
 * @param projectPath - Absolute or relative path to the project folder.
 * @returns The parsed contents of the `package.json` file.
 *
 * @throws If the file does not exist or contains invalid JSON.
 *
 * @example
 * getPackageJson('/repo/packages/core');
 * // { name: '@xaendar/core', version: '1.2.0', Dependencies: { ... } }
 *
 * getPackageJson(''); // reads the root package.json
 */
function getPackageJson(projectPath: string): PackageJson {
  const packageJsonPath = join(projectPath, 'package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
}

function getMainPackageJsonDependencies(): Partial<Record<string, string>> & { self: string } {
  const mainPackageJsonPath = resolve('..', 'package.json');
  const mainPackageJson: PackageJson = JSON.parse(readFileSync(mainPackageJsonPath, 'utf-8'));

  return {
    ...mainPackageJson.dependencies ?? {},
    ...mainPackageJson.devDependencies ?? {},
    self: mainPackageJson.version!
  };
}

checkDependencies();