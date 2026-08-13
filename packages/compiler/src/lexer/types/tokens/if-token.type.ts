import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer encounters an `@if` keyword.
 */
export type IfToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an if keyword.
   */
  type: TokenType.IF
}>
