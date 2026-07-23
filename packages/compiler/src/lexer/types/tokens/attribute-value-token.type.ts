import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes an HTML attribute value.
 */
export type AttributeValueToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an attribute.
   */
  type: TokenType.ATTRIBUTE_VALUE
  /**
   * `parts[0]` is the literal `value`.
   */
  parts: [string]
}>
