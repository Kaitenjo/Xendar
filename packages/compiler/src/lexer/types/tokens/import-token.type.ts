import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes an @import
 */
export type ImportToken = {
  /**
   * Discriminant identifying this token as an import.
   */
  type: TokenType.IMPORT,
  /**
   * `parts[0]` is the raw `path` string.
   */
  parts: [string]
}
