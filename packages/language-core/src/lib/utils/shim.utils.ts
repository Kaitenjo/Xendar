import { TypeCheckResult } from '@xaendar/compiler';
import { basename, extname, resolve } from 'node:path';
import { upsertVirtualFile } from '../language-service';

export function createShim(componentData: Map<string, string[]>, typecheckBody: TypeCheckResult): { code: string, bodyLineOffset: number, path: string, classNames: string[] } {
  const entries = Array.from(componentData.entries());
  const shimPath = `${entries[0][0]}.__typecheck__.ts`;
  const shim = buildTypecheckShim(entries, shimPath, typecheckBody.text);
  upsertVirtualFile(shimPath, shim.code);
  return shim;
}

/**
 * Wraps the compiler's fictitious type-check body with the import of the
 * real component class and the `declare const root` binding, so the shim
 * type-checks the DSL expressions against the actual class members.
 *
 * The shim is generated as a sibling of the real component file (same
 * directory, `.__typecheck__.ts` suffix) so that the relative import below
 * resolves correctly via the LanguageServiceHost's standard module
 * resolution against the real filesystem.
 *
 * @param classNames - Name of the exported component class, as extracted
 *   from the transpiled source.
 * @param componentFilePath - Absolute path of the real component files.
 * @param body - The fictitious-TS type-check body produced by the compiler
 *   (the `function typeCheck() {...}` blocks and friends).
 * @returns The full shim source, ready to be passed to `updateVirtualFile`.
 */
function buildTypecheckShim(componentData: [string, string[]][], shimPath: string, body: string): { code: string, bodyLineOffset: number, path: string, classNames: string[] } {
  const prefixLinesLength = componentData.length + 3;
  const prefixLines = new Array<string>(prefixLinesLength).fill(''); 
  const classNames = new Array<string>();

  for (let i = 0; i < componentData.length; i++) {
    const [path, classes] = componentData[i];
    classNames.push(...classes);
    prefixLines[i] = `import { ${classes.join(', ')} } from './${basename(path, extname(path))}';`
  }

  prefixLines[prefixLinesLength - 2] = `declare const root: ${classNames.join(' & ')};`

  return {
    code: [...prefixLines, body].join('\n'),
    bodyLineOffset: prefixLinesLength,
    path: shimPath,
    classNames
  };
}

/**
 * Extracts the `templateUrl` and `styleUrl` values from the `@WebComponent`
 * decorator in the component source and resolves them to absolute paths.
 *
 * @param jsSource - The raw TypeScript source of the component file.
 * @param componentDir - The directory containing the component file, used as
 *   base for resolving relative decorator paths.
 * @returns An object with the resolved `templatePath` and `stylePath`.
 *   Either field may be `undefined` when the corresponding decorator
 *   property is absent.
 */
export function extractDecoratorPaths(jsSource: string, componentDir: string): { templatePath?: string, stylePath?: string } {
  const templateUrl = jsSource.match(/templateUrl\s*:\s*["'](.+?)["']/)?.[1];
  const styleUrl = jsSource.match(/styleUrl\s*:\s*["'](.+?)["']/)?.[1];

  return {
    templatePath: templateUrl ? resolve(componentDir, templateUrl) : undefined,
    stylePath: styleUrl ? resolve(componentDir, styleUrl) : undefined
  };
}