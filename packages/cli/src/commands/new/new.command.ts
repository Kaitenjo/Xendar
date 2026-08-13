import { Command } from 'commander';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path/win32';
import { generateComponent } from '../generate/component/component.command';
import { buildStructure, Entry } from './structure';
import { execSync } from 'node:child_process';

/**
 * Creates and returns the `new` command.
 *
 * Scaffolds a new Xaendar project by generating the base directory structure
 * and initial component files.
 *
 * @returns The configured `new` {@link Command} instance ready to be
 *   added to the root program.
 */
export function newCommand(): Command {
  return new Command('new')
    .description('Scaffold a new Xaendar project')
    .argument('<name>', 'Name of the project to create')
    .option('-p, --path <path>', 'Custom path for the generated project (default: current directory)')
    .option('-s, --style <style>', 'CSS preprocessor to use (css, scss, less, styl)', 'css')
    .action((name: string, options: { path?: string, style?: string }) => {
      const style = resolveStyleOptions(options.style);
      const workingDirectory = options.path || process.cwd();
      const projectDirectory = resolve(workingDirectory, name);

      checkAndCreateProjectDirectory(projectDirectory);
      createFiles(buildStructure({ name, style }), projectDirectory, style);
      execSync('npm i', { stdio: 'inherit', cwd: projectDirectory });
    });
}

/**
 * Resolves the style option, providing a default and validating the input.
 *
 * @param style - The CSS preprocessor option provided by the user.
 * @returns The validated style string, defaulting to `'css'` if not provided.
 */
function resolveStyleOptions(style: string | undefined): string {
  const validStyles = ['css', 'scss', 'less', 'styl'];
  if (!style) {
    return 'css';
  }

  if (!validStyles.includes(style)) {
    console.error(`✖  Invalid style option: ${style}`);
    process.exit(1);
  }

  return style;
}

/**
 * Checks whether the target project directory exists and is empty.
 * Creates the directory if it does not exist, or exits the process with an
 * error if it exists and is not empty.
 *
 * @param path - The absolute path to the project directory to check and create.
 */
function checkAndCreateProjectDirectory(path: string): void {
  const exists = existsSync(path);
  if (exists && readdirSync(path).length) {
    console.error(`✖  Cannot create project: target directory is not empty: ${path}`);
    process.exit(1);
  }

  if (!exists) {
    mkdirSync(path);
  }
}

/**
 * Recursively processes the provided entries to create files and directories on disk.
 * @param entries - An array of entries defining the structure to create.
 * @param basePath - The base path where the entries should be created.
 * @param style - The CSS preprocessor style to use for generated components, passed down to the component generator.
 */
function createFiles(entries: Entry[], basePath: string, style: string): void {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    switch (entry.type) {
      case 'file':
      case undefined:
        const content = entry.content;
        writeFileSync(resolve(basePath, entry.name), content, 'utf8');
        break;

      case 'directory':
        const dirPath = resolve(basePath, entry.name);
        mkdirSync(dirPath);
        if (entry.children) {
          createFiles(entry.children, dirPath, style);
        }
        break;

      case 'generateComponent':
        generateComponent(entry.name, basePath, false, style);
        break;
    }
  };
}