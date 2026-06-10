import { Token } from '../../lexer/types/token.type'

/**
 * Represents the token currently pointed to by the parser cursor.
 */
export type CurrentToken = {
  /**
   * The token object at the current cursor position.
   */
  value: Token
  /**
   * Absolute zero-based index of this token in the token array.
   */
  index: number
}