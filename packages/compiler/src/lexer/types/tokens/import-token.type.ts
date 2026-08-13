import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes an @import
 */
export type ImportToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as an import.
   */
  type: TokenType.IMPORT,

  parts: [import: string]
}>
