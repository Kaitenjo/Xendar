import { ImportNode } from '../../parser/types/nodes/import-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { plain } from '../utils/line-builder.utils';

/**
 * Type-checks an `@import` node.
 *
 * Emits a typed variable declaration for each specifier so symbols are
 * available in template expressions. Metadata extraction (component/directive
 * decorator analysis) happens in a separate async phase via
 * `TypeChecker.populateImportMetadata()`.
 */
export function typeCheckImport(node: ImportNode, _processNode: ProcessNode, _context?: TypeCheckContext): Line[] {
  const source = node.path;
  const escapedSource = escapeTypeString(source);
  const lines = new Array<Line>();

  for (let i = 0; i < node.specifiers.length; i++) {
    const { imported, local } = node.specifiers[i];

    switch (imported) {
      case '*':
        lines.push(plain(`let ${local}!: typeof import('${escapedSource}');`));
        break;
      case 'default':
        lines.push(plain(`let ${local}!: typeof import('${escapedSource}')['default'];`));
        break;
      default:
        const escapedImported = escapeTypeString(imported);
        lines.push(plain(`let ${local}!: typeof import('${escapedSource}')['${escapedImported}'];`));
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