import { NoArgsFunction } from '@xaendar/types';
import { ImportPathToken } from '../../../lexer/types/tokens/import-path-token.type';
import { ParserCursor } from '../../models/parser-cursor.model';
import { ASTNode } from '../../types/ast.type';
import { TokenType } from '../../../lexer/types/token-type.enum';

/**
 * Parses a TEXT token into a `TextNode`.
 *
 * @param cursor - Parser cursor; advanced past the TEXT token.
 * @param _parseNode - Unused parser function (kept for signature consistency).
 * @param token - The TEXT token containing the raw text content.
 * @returns The parsed `TextNode`.
 */
export function parseImport(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, _token: ImportPathToken): undefined {
  while (cursor.peek().type === TokenType.IMPORT) {
    cursor.advance();
  }

  // Consume TokenType.IMPORT_PATH
  cursor.advance();
}
