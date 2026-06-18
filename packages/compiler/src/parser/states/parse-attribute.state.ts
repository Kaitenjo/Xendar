import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { AttributeToken } from '../../lexer/types/tokens/attribute-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { AttributeNode } from '../types/nodes/attribute-node.type';
import { parseInterpolation } from './parse-interpolation.state';
import { EventToken } from '../../lexer/types/tokens/event-token.type';
import { TagCloseNameToken } from '../../lexer/types/tokens/tag-close-name-token.type';
import { AttributeValueToken } from '../../lexer/types/tokens/attribute-value-token.type';
import { InterpolationExpressionToken } from '../../lexer/types/tokens/interpolation-expression-token.type';
import { InterpolationLiteralToken } from '../../lexer/types/tokens/interpolation-literal-token.type';

/**
 * Parses an ATTRIBUTE token into an `AttributeNode`.
 * Handles boolean attributes (no `=`), string values, and interpolation values.
 *
 * @param cursor Parser cursor; advanced past the ATTRIBUTE token.
 * @param parseNode Parser node function for recursive parsing.
 * @param token The ATTRIBUTE token to parse.
 * @returns The parsed `AttributeNode`.
 */
export function parseAttribute(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: AttributeToken): AttributeNode {
  // consume Attribute token
  cursor.advance();
  const name = token.parts[0];
  
  // All possible tokens after an Attribute Token
  const nextToken = cursor.peek<
    | AttributeValueToken 
    | AttributeToken 
    | EventToken 
    | TagCloseNameToken 
    | InterpolationExpressionToken 
    | InterpolationLiteralToken
  >();

  if (nextToken.type === TokenType.ATTRIBUTE || nextToken.type === TokenType.TAG_CLOSE_NAME || nextToken.type === TokenType.EVENT) {
    return { name, value: 'true' };
  }

  if (nextToken.type === TokenType.INTERPOLATION_EXPRESSION || nextToken.type === TokenType.INTERPOLATION_LITERAL) {
    return {
      name,
      value: parseInterpolation(cursor, parseNode, nextToken)
    };
  }

  if (nextToken.type !== TokenType.ATTRIBUTE_VALUE) {
    throw new Error(`[Parser] Attribute value missing for ${name} in: ${name}`);
  }

  cursor.advance();

  return {
    name,
    value: nextToken.parts[0]
  };
}
