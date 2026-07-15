/**
 * A diagnostic produced by {@link validateExpression} when the input string
 * contains a syntax error or a construct that is not permitted inside
 * Xaendar template expressions.
 */
export type ExpressionDiagnostic = {
  /** 
   * Human-readable description of the problem. 
   */
  message: string;
  /**
   * Zero-based character offset from the start of the original expression
   * string at which the problem begins.
   */
  start: number;
  /** 
   * Number of characters covered by the problematic range. 
   */
  length: number;
}