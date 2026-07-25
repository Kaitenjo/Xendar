import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted for the handler name in a DOM event binding `@eventName=handler`.
 */
export type EventHandlerToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an event handler.
   */
  type: TokenType.EVENT_HANDLER
  /**
   * `parts[0]` is the handler identifier, without quote delimiters.
   */
  parts: [string]
}>;