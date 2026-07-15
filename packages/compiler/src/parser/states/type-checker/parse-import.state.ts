import { NoArgsFunction } from '@xaendar/types';
import { ImportPathToken } from '../../../lexer/types/tokens/import-path-token.type';
import { ParserCursor } from '../../models/parser-cursor.model';
import { ASTNode } from '../../types/ast.type';

/**
 * Parses a TEXT token into a `TextNode`.
 *
 * @param cursor - Parser cursor; advanced past the TEXT token.
 * @param _parseNode - Unused parser function (kept for signature consistency).
 * @param token - The TEXT token containing the raw text content.
 * @returns The parsed `TextNode`.
 */
export function parseImport(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, _token: ImportPathToken): ImportNode {
  cursor.advance();

  return {

  }
}
