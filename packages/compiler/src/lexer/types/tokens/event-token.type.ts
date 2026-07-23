import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes a DOM event binding declared with `@eventName=handler`.
 */
export type EventToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an event binding.
   */
  type: TokenType.EVENT
  /**
   * `parts[0]` is the raw `eventName=handler` string.
   */
  parts: [string]
}>
