import { NoArgsFunction } from '@xaendar/types';
import { InterpolationExpressionToken } from '../../lexer/types/tokens/interpolation-expression-token.type.js';
import { InterpolationLiteralToken } from '../../lexer/types/tokens/interpolation-literal-token.type.js';
import { ParserCursor } from '../models/parser-cursor.model.js';
import { ASTNode } from '../types/ast.type.js';
import { ASTNodeType } from '../types/node.enum.js';
import { InterpolationNode } from '../types/nodes/interpolation-node.type.js';
import { validateExpression } from '../utils/expression-validator.js';

/**
 * Parses an interpolation expression or literal token into an `InterpolationNode`.
 *
 * @param cursor Parser cursor; advanced past the interpolation token.
 * @param _parseNode Unused parser function.
 * @param token The INTERPOLATION_EXPRESSION or INTERPOLATION_LITERAL token.
 * @returns The parsed `InterpolationNode`.
 */
export function parseInterpolation(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, token: InterpolationExpressionToken | InterpolationLiteralToken): InterpolationNode {
  cursor.advance();
  
  return {
    type: ASTNodeType.Interpolation,
    expression: validateExpression(token.parts[0]).node
  };
}
