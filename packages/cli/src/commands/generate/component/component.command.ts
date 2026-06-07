import { isValidCustomElementName } from '@xaendar/common';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toPascalCase } from '../../../utils/case.utils';

/**
 * Scaffolds a new Xaendar component inside a dedicated folder.
 *
 * Creates the directory `<cwd>/<name>/` and writes the following files:
 * - `<name>.xd.component.ts`      — class decorated with `@WebComponent`
 * - `<name>.xd.component.html`    — minimal template
 * - `<name>.xd.component.css`     — empty stylesheet
 * - `<name>.xd.component.spec.ts` — Vitest skeleton
 *
 * Exits the process with code `1` if the target directory already exists.
 *
 * @param name - The component name in any casing (`my-button`, `myButton`,
 *   `my_button`). Used as-is for filenames; converted to PascalCase for the
 *   class name and to kebab-case for the selector.
 * @param path - The base path where the component folder will be created (default:
 *   current working directory).
 */
export function generateComponent(name: string, path: string, force?: boolean, style?: string): void {
  if (!isValidCustomElementName(name)) {
    process.exit(1);
  }
  
  const dir = join(path, name);
  // Fallback we should read form xaendar config file
  style ??= 'css';

  if (existsSync(dir)) {
    if (force) {
      console.log(`Deleting "${name}"...`);
      rmSync(dir, { recursive: true, force: true });
      console.log('✔  Component Deleted.')
    } else {
      console.error(`✖  Directory "${name}" already exists.`);
      process.exit(1);
    }
  }

  mkdirSync(dir, { recursive: true });

  const files: [string, string][] = [
    [`${name}.xd.component.ts`, tsTemplate(name, style)],
    [`${name}.xd.component.html`, htmlTemplate(name)],
    [`${name}.xd.component.${style}`, cssTemplate(name)],
    [`${name}.xd.component.spec.ts`, specTemplate(name)],
  ];

  for (const [filename, content] of files) {
    writeFileSync(join(dir, filename), content, 'utf8');
  }

  console.log();
  console.log(`✔  Component "${name}" generated:`);
  for (const [filename] of files) {
    console.log(`${name}/${filename}`);
  }
}

/**
 * Generates the TypeScript source file content for a component.
 *
 * @param name - The component name used to derive the class name, selector,
 *   and asset paths.
 * @returns A string containing the full TypeScript source.
 */
function tsTemplate(name: string, style: string): string {
  const className = toPascalCase(name);
  return `import { BaseWebComponent, WebComponent } from '@xaendar/core';

@WebComponent({
  selector: '${name}',
  styleUrl: './${name}.xd.component.${style}',
  templateUrl: './${name}.xd.component.html'
})
export class ${className}Component extends BaseWebComponent {

}`;
}

/**
 * Generates the HTML template file content for a component.
 *
 * @param name - The component name shown in the placeholder paragraph.
 * @returns A string containing the minimal HTML template.
 */
function htmlTemplate(name: string): string {
  return `<p>${name} works!</p>\n`;
}

/**
 * Generates the CSS stylesheet file content for a component.
 *
 * @param _name - The component name (unused; kept for signature consistency).
 * @returns A string containing an empty stylesheet with a placeholder comment.
 */
function cssTemplate(_name: string): string {
  return `/* component styles */\n`;
}

/**
 * Generates the Vitest spec file content for a component.
 *
 * @param name - The component name used to derive the class name and import
 *   path.
 * @returns A string containing a minimal `describe` / `it` test skeleton.
 */
function specTemplate(name: string): string {
  const className = toPascalCase(name);
  return `import { describe, expect, it } from "vitest";
import { ${className}Component } from './${name}.xd.component';

describe('${className}Component', () => {
  it('should create', () => {
    const component = new ${className}Component();
    expect(component).toBeTruthy();
  });
});
`;
}