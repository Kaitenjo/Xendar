import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes an HTML attribute name (and optional value).
 */
export type AttributeToken = {
  /**
   * Discriminant identifying this token as an attribute.
   */
  type: TokenType.ATTRIBUTE
  /**
   * `parts[0]` is the raw `name` or `name=value` string.
   */
  parts: [string]
}
