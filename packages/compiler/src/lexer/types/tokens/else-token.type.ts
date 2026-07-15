import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters an `@else` keyword.
 */
export type ElseToken = {
  /**
   * Discriminant identifying this token as an else keyword.
   */
  type: TokenType.ELSE
}
