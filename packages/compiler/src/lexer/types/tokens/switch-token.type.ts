import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters a `@switch` keyword.
 */
export type SwitchToken = {
  /**
   * Discriminant identifying this token as a switch keyword.
   */
  type: TokenType.SWITCH
}
