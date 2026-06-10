import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes a JavaScript expression interpolation `{ expression }`.
 */
export type InterpolationExpressionToken = {
  /**
   * Discriminant identifying this token as an expression interpolation.
   */
  type: TokenType.INTERPOLATION_EXPRESSION;
  /**
   * `parts[0]` is the raw JavaScript expression string.
   */
  parts: [string];
}
