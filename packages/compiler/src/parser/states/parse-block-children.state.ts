import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNodeKind } from '../types/ast.type';

/**
 * Parses child AST nodes inside a flow-control block until a BLOCK_CLOSE token is reached.
 * Consumes the BLOCK_CLOSE token before returning.
 *
 * @param cursor - Parser cursor positioned at the first token inside the block.
 * @param parseNode - Parser function for recursive child parsing.
 * @returns Array of parsed child `ASTNode`s.
 */
export function parseBlockChildren(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNodeKind | undefined>): ASTNodeKind[] {
  const children = new Array<ASTNodeKind>;

  while (cursor.peek().type !== TokenType.BLOCK_CLOSE) {
    const child = parseNode();
    if (child) {
      children.push(child);
    }
  }

  // consume BLOCK_CLOSE
  cursor.advance();
  return children;
}
