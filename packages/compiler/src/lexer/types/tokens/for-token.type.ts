import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer encounters a `@for` keyword.
 */
export type ForToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a for keyword.
   */
  type: TokenType.FOR
}>
