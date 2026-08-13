import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Sentinel token emitted when the lexer reaches the end of the input stream.
 */
export type EventParAmeterToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as end-of-file.
   */
  type: TokenType.EVENT_PARAMETER,
  /**
   * String represeting the event
   */
  parts: [parameter: string]
}>
