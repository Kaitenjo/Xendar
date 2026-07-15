import { TokenType } from '../token-type.enum';

/**
 * Sentinel token emitted when the lexer reaches the end of the input stream.
 */
export type EOFToken = {
  /**
   * Discriminant identifying this token as end-of-file.
   */
  type: TokenType.EOF
}
