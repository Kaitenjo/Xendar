/**
 * Represents a character within a string during parsing.
 */
export type CurrentChar = {
  /**
   * Index of the character in the original string.
   */
  index: number
  /**
   * UTF-16 code unit of the character (from String.charCodeAt).
   */
  code: number
  /**
   * String value of the character.
   */
  value: string
}
