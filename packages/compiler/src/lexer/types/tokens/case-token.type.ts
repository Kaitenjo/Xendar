import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer encounters a `@case` keyword.
 */
export type CaseToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a case keyword.
   */
  type: TokenType.CASE
}>
