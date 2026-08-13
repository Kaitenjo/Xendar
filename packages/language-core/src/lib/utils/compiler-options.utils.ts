import { dirname } from 'node:path';
import { CompilerOptions, findConfigFile, sys, readConfigFile, parseJsonConfigFileContent } from 'typescript';

/**
 * Loads the `tsconfig.json` compilerOptions applicable to the given
 * directory, using TypeScript's standard config file resolution
 * (`findConfigFile` walks up parent directories). Falls back to an empty
 * options object if no config file is found, rather than throwing —
 * type checking simply runs with default settings in that case.
 *
 * @param fromDir - Directory to start searching for `tsconfig.json` from,
 *   typically the directory of the component file being transformed.
 */
export function loadCompilerOptions(fromDir: string): CompilerOptions {
  const configPath = findConfigFile(fromDir, sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return {};
  }

  const configFile = readConfigFile(configPath, sys.readFile);
  const parsed = parseJsonConfigFileContent(configFile.config, sys, dirname(configPath));
  return parsed.options;
}