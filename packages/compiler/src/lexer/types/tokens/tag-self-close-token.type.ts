import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters a self-closing tag marker `/>`.
 */
export type TagSelfCloseToken = {
  /**
   * Discriminant identifying this token as a self-closing tag.
   */
  type: TokenType.TAG_SELF_CLOSE,
  /**
   * No associated parts for this token.
   */
  parts: []
}
