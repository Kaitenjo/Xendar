import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes an @import
 */
export type ImportPathToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an import.
   */
  type: TokenType.IMPORT_PATH,
  /**
   * `parts[0]` is the raw `path` string.
   */
  parts: [path: string]
}>
