import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters an `@else if` keyword.
 */
export type ElseIfToken = {
  /**
   * Discriminant identifying this token as an else if keyword.
   */
  type: TokenType.ELSE_IF
}
