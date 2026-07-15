import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes an HTML attribute value.
 */
export type AttributeValueToken = {
  /**
   * Discriminant identifying this token as an attribute.
   */
  type: TokenType.ATTRIBUTE_VALUE
  /**
   * `parts[0]` is the literal `value`.
   */
  parts: [string]
}
