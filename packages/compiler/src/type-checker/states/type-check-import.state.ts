import { ImportNode } from '../../parser/types/nodes/import-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an `@import` node.
 *
 * Emits a typed variable declaration for each specifier so symbols are
 * available in template expressions. Metadata extraction (component/directive
 * decorator analysis) happens in a separate async phase via
 * `TypeChecker.populateImportMetadata()`.
 */
export function typeCheckImport(node: ImportNode, _processNode: ProcessNode, _context?: TypeCheckContext): string[] {
  const source = node.path;
  const escapedSource = escapeTypeString(source);
  const lines = new Array<string>();

  
  for (let i = 0; i < node.specifiers.length; i++) {
    const { imported, local } = node.specifiers[i];

    switch (imported) {
      case '*':
        lines.push(`let ${local}!: typeof import('${escapedSource}');`);
        break;

      case 'default':
        lines.push(`let ${local}!: typeof import('${escapedSource}')['default'];`);
        break;

      default:
        const escapedImported = escapeTypeString(imported);
        lines.push(`let ${local}!: typeof import('${escapedSource}')['${escapedImported}'];`);
        break;
    }
  }

  return lines;
}

/**
 * Escapes path/specifier text for safe use in TS single-quoted type strings.
 */
function escapeTypeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}