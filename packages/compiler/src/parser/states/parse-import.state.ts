import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { ImportPathToken } from '../../lexer/types/tokens/import-path-token.type';
import { ImportToken } from '../../lexer/types/tokens/import-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNodeKind } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { ImportSpecifier } from '../types/nodes/import-specifier.type';
import { ImportNode } from '../types/nodes/import-node.type';

/**
 * Parses an `@import` statement.
 *
 * Extracts specifiers with optional aliases and maps them to structured
 * `ImportSpecifier` objects. Supports:
 * - `foo` → imported: 'foo', local: 'foo'
 * - `foo as bar` → imported: 'foo', local: 'bar'
 * - `default as D` → imported: 'default', local: 'D'
 * - `* as ns` → imported: '*', local: 'ns'
 */
export function parseImport(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNodeKind | undefined>, _token: ImportPathToken): ImportNode {
  const specifiers = new Array<ImportSpecifier>();

  while (cursor.peek().type === TokenType.IMPORT) {
    cursor.advance();
    const rawSpecifier = cursor.getCurrentToken<ImportToken>().value.parts[0];
    const specifier = parseSpecifier(rawSpecifier);
    specifiers.push(specifier);
  }

  // Consume TokenType.IMPORT_PATH
  cursor.advance();

  return {
    type: ASTNodeType.Import,
    specifiers,
    path: cursor.getCurrentToken<ImportPathToken>().value.parts[0]
  }
}

/**
 * Parses a single import specifier string.
 *
 * @param raw - The raw specifier string (may include 'as' alias).
 * @returns An `ImportSpecifier` with `imported` and `local` fields.
 * @throws If the specifier format is invalid.
 */
function parseSpecifier(raw: string): ImportSpecifier {
  const trimmed = raw.trim();

  // Namespace import: `* as ns`
  const namespaceMatch = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (namespaceMatch) {
    return {
      imported: '*',
      local: namespaceMatch[1]!,
    };
  }

  // Default import with alias: `default as D`
  const defaultMatch = trimmed.match(/^default\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (defaultMatch) {
    return {
      imported: 'default',
      local: defaultMatch[1]!,
    };
  }

  // Named import with optional alias: `foo` or `foo as bar`
  const namedMatch = trimmed.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
  if (namedMatch) {
    return {
      imported: namedMatch[1]!,
      local: (namedMatch[2] ?? namedMatch[1])!,
    };
  }

  throw new Error(`[Parser] Invalid import specifier "${raw}".`);
}
