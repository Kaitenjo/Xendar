import { Command } from 'commander';
import { generateComponent } from './component/component.command';

/**
 * Creates and returns the `generate` command (alias `g`) with all its
 * sub-commands registered.
 *
 * @returns The configured `generate` {@link Command} instance ready to be
 *   added to the root program.
 */
export function generateCommand(): Command {
  return new Command('generate')
    .alias('g')
    .description('Generate Xaendar building blocks')
    .command('component <name>')
    .alias('c')
    .option('-p, --path <path>', 'Custom path for the generated component (default: current directory)')
    .option('-f, --force', 'Force generation deleting current component if already exists')
    .description('Generate a new component (creates <name>/ folder with .ts, .html, .css, .spec.ts)')
    .action((name: string, options: { path?: string, force?: boolean }) => {
      const path = options.path || process.cwd();
      generateComponent(name, path, !!options.force);
    });
}
