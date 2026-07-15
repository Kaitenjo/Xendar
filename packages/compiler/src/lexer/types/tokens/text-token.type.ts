import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes a run of plain text content.
 */
export type TextToken = {
  /**
   * Discriminant identifying this token as plain text.
   */
  type: TokenType.TEXT,
  /**
   * `parts[0]` is the raw text string.
   */
  parts: [string]
}
