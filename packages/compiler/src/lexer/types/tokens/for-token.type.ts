import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters a `@for` keyword.
 */
export type ForToken = {
  /**
   * Discriminant identifying this token as a for keyword.
   */
  type: TokenType.FOR
}
