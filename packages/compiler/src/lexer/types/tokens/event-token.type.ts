import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted for the event name in a DOM event binding `@eventName=handler`.
 */
export type EventToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an event binding.
   */
  type: TokenType.EVENT
  /**
   * `parts[0]` is the event name (e.g. `click`, `collapsedChange`).
   */
  parts: [string]
}>
