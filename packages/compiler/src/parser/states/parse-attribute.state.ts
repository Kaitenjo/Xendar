import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { AttributeToken } from '../../lexer/types/tokens/attribute-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { AttributeNode } from '../types/nodes/attribute-node.type';
import { parseInterpolation } from './parse-interpolation.state';

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
  // consume ATTRIBUTE token
  cursor.advance();
  const raw = token.parts[0];

  if (!raw.includes('=')) {
    return { name: raw, value: 'true' };
  }

  const [name, value] = raw.split('=');
  if (!name) {
    throw new Error(`[Parser] Attribute name missing in: ${raw}`);
  }

  const nextToken = cursor.peek();
  if (nextToken.type === TokenType.INTERPOLATION_EXPRESSION || nextToken.type === TokenType.INTERPOLATION_LITERAL) {
    return {
      name,
      value: parseInterpolation(cursor, parseNode, nextToken)
    };
  }

  if (!value) {
    throw new Error(`[Parser] Attribute value missing for ${name} in: ${raw}`);
  }

  return {
    name,
    value: value.replace(/^['']|['']$/g, '')
  };
}
