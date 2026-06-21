import { NoArgsFunction } from '@xaendar/types';
import { InterpolationExpressionToken } from '../../lexer/types/tokens/interpolation-expression-token.type';
import { InterpolationLiteralToken } from '../../lexer/types/tokens/interpolation-literal-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { InterpolationNode } from '../types/nodes/interpolation-node.type';
import { validateExpression } from '../utils/expression-validator';

/**
 * Parses an interpolation expression or literal token into an `InterpolationNode`.
 *
 * @param cursor - Parser cursor; advanced past the interpolation token.
 * @param _parseNode - Unused parser function (kept for signature consistency).
 * @param token - The INTERPOLATION_EXPRESSION or INTERPOLATION_LITERAL token.
 * @returns The parsed `InterpolationNode`.
 */
export function parseInterpolation(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, token: InterpolationExpressionToken | InterpolationLiteralToken): InterpolationNode {
  cursor.advance();
  
  return {
    type: ASTNodeType.Interpolation,
    expression: validateExpression(token.parts[0]).node
  };
}
