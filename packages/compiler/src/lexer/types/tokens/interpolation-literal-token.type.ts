import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes a template-literal interpolation `` {`...`} ``.
 */
export type InterpolationLiteralToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a literal interpolation.
   */
  type: TokenType.INTERPOLATION_LITERAL;
  /**
   * `parts[0]` is the raw template literal string (without surrounding backticks).
   */
  parts: [string];
}>
