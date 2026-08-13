import { TypeCheckResult } from '@xaendar/compiler';
import { basename, extname, resolve } from 'node:path';
import { upsertVirtualFile } from '../language-service';

export function createShim(className: string, shimId: string, typecheckBody: TypeCheckResult): { code: string, bodyLineOffset: number, path: string } {
  const shimPath = `${shimId}.__typecheck__.ts`;
  const shim = buildTypecheckShim(className, shimId, shimPath, typecheckBody.text);
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
 * @param className - Name of the exported component class, as extracted
 *   from the transpiled source.
 * @param componentFilePath - Absolute path of the real component file.
 * @param body - The fictitious-TS type-check body produced by the compiler
 *   (the `function typeCheck() {...}` blocks and friends).
 * @returns The full shim source, ready to be passed to `updateVirtualFile`.
 */
function buildTypecheckShim(className: string, shimPath: string, componentFilePath: string, body: string): { code: string, bodyLineOffset: number, path: string } {
  const importSpecifier = `./${basename(componentFilePath, extname(componentFilePath))}`;

  const prefixLines = [
    `import { ${className} } from '${importSpecifier}';`,
    '',
    `declare const root: ${className};`,
    '',
  ];

  return {
    code: [...prefixLines, body].join('\n'),
    bodyLineOffset: prefixLines.length,
    path: shimPath
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