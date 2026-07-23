import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes a closing tag name, e.g. `div` in `</div>`.
 */
export type TagCloseNameToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a closing tag name.
   */
  type: TokenType.TAG_CLOSE_NAME,
  /**
   * `parts[0]` is the tag name string.
   */
  parts: [string]
}>
