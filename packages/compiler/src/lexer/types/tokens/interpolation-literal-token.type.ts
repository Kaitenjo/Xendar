import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes a template-literal interpolation `` {`...`} ``.
 */
export type InterpolationLiteralToken = {
  /**
   * Discriminant identifying this token as a literal interpolation.
   */
  type: TokenType.INTERPOLATION_LITERAL;
  /**
   * `parts[0]` is the raw template literal string (without surrounding backticks).
   */
  parts: [string];
}
