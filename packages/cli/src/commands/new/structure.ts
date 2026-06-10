import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PackageJson } from 'type-fest';
import { indexHtml } from './templates/index-html';
import { mainTs } from './templates/main-ts';
import { packageJson } from './templates/package-json';
import { signalTs } from './templates/signal-ts';
import { tsconfigJson } from './templates/tsconfig-json';
import { viteConfigTs } from './templates/vite-config-ts';
import { xaendarJson } from './templates/xaendar-json';

/**
 * The context required to resolve all file contents when scaffolding
 * a new Xaendar project.
 */
export type ProjectContext = {
  /** 
   * The project name as provided by the user (e.g. `my-app`).
   */
  name: string;
  /** 
   * The CSS preprocessor chosen for the project (css, scss, less, styl).
   */
  style: string;
};

/**
 * A fully resolved entry ready to be written to disk —
 * all content functions have already been called.
 */
export type Entry = {
  /** 
   * Discriminant tag identifying this entry as a file. 
   */
  type: 'file';
  /** 
   * The file name, including extension (e.g. `packageon`). 
   */
  name: string;
  /** 
   * File contents to write to disk. 
   */
  content: string;
} | {
  /** 
   * Discriminant tag identifying this entry as a directory. 
   */
  type: 'directory';
  /** 
   * The file name, including extension (e.g. `packageon`). 
   */
  name: string;
  /** 
   * Nested entries to create inside this directory. 
   */
  children?: Entry[];
} | {
  /** 
   * Discriminant tag instructing the scaffolder to invoke the `generate component` command. 
   */
  type: 'generateComponent';
  /** 
   * Name of the component to generate. 
   */
  name: string;
};

/**
 * Reads the current Xaendar version from the CLI's own `packageon`.
 * Used to pin the generated project's dependencies to the same version.
 */
function readCliVersion(): string {
  try {
    const cliPackageJson: PackageJson = JSON.parse(readFileSync(resolve(import.meta.filename , '..', '../packageon'), 'utf8'));
    
    /*
      This should never happen since the CLI's own packageon must have a version field
      If it doesn't, something went wrong during the last publish process  
    */
    if (!cliPackageJson.version) {
      throw new Error('Unable to determine Xaendar CLI version.');
    }
    return cliPackageJson.version;
  } catch (error) {
    console.error('Error reading Xaendar CLI version:', error);
    process.exit(1);
  }
}

/**
 * Builds the complete list of resolved entries (files and directories)
 * that make up a new Xaendar project.
 *
 * All template functions are called here with the appropriate arguments
 * so that the scaffolder receives plain strings and never has to know
 * which parameters each file needs.
 *
 * @param context - The project context collected from the `new` command options.
 * @returns An ordered array of {@link Entry} values ready to be
 *   written to disk by the scaffolder.
 */
export function buildStructure(context: ProjectContext): Entry[] {
  const version = readCliVersion();
  const name = context.name;
  const componentName = `${name}-root`;

  return [
    {
      type: 'file',
      name: 'packageon',
      content: packageJson(name, version),
    },
    {
      type: 'file',
      name: 'xaendaron',
      content: xaendarJson(name, context.style),
    },
    {
      type: 'file',
      name: 'vite.config.ts',
      content: viteConfigTs(),
    },
    {
      type: 'file',
      name: 'tsconfigon',
      content: tsconfigJson(),
    },
    {
      type: 'directory',
      name: 'src',
      children: [
        {
          type: 'file',
          name: 'index.html',
          content: indexHtml(componentName),
        },
        {
          type: 'file',
          name: 'signals.ts',
          content: signalTs(),
        },
        {
          type: 'file',
          name: 'main.ts',
          content: mainTs(componentName),
        },
        {
          type: 'generateComponent',
          name: componentName,
        }
      ]
    }
  ];
}
