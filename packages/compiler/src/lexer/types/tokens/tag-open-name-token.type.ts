import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes an opening tag name, e.g. `div` in `<div`.
 */
export type TagOpenNameToken = {
  /**
   * Discriminant identifying this token as an opening tag name.
   */
  type: TokenType.TAG_OPEN_NAME;
  /**
   * `parts[0]` is the tag name string.
   */
  parts: [string];
}
