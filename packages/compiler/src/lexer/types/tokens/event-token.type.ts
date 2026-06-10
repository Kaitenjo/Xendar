import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes a DOM event binding declared with `@eventName=handler`.
 */
export type EventToken = {
  /**
   * Discriminant identifying this token as an event binding.
   */
  type: TokenType.EVENT
  /**
   * `parts[0]` is the raw `eventName=handler` string.
   */
  parts: [string]
}
