import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer consumes the condition expression `(...)` of a flow-control directive.
 */
export type ConditionToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a condition expression.
   */
  type: TokenType.CONDITION;
  /**
   * `parts[0]` is the raw condition expression string (without surrounding parentheses).
   */
  parts: [string];
}>
