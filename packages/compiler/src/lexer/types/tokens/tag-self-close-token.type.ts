import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer encounters a self-closing tag marker `/>`.
 */
export type TagSelfCloseToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a self-closing tag.
   */
  type: TokenType.TAG_SELF_CLOSE,
  /**
   * No associated parts for this token.
   */
  parts: []
}>
