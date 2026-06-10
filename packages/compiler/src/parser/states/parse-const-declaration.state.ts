import { NoArgsFunction } from '@xaendar/types';
import { ConstDeclarationToken } from '../../lexer/types/tokens/const-declaration-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { ConstDeclarationNode } from '../types/nodes/const-declaration-node.type';
import { validateExpression } from '../utils/expression-validator';

/**
 * Parses a CONST_DECLARATION token into a `ConstDeclarationNode`.
 *
 * @param cursor Parser cursor; advanced past the CONST_DECLARATION token.
 * @param _parseNode Unused parser function.
 * @param token The CONST_DECLARATION token containing variable name and expression.
 * @returns The parsed `ConstDeclarationNode`.
 */
export function parseConstDeclaration(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, token: ConstDeclarationToken): ConstDeclarationNode {
  cursor.advance();

  return {
    type: ASTNodeType.ConstDeclaration,
    varName: token.parts[0],
    expression: validateExpression(token.parts[1]).node
  };
}
