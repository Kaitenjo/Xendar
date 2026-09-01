/**
 * Options for resolving an expression during code generation.
 */
export type ResolveExpressionOptions = { 
  /**
   * The name of the resolver function to use for resolving the expression.
   */
  resolver?: string
  /**
   * Treat an identifier as if it is unresolvable
   */
  skipResolution?: boolean
}