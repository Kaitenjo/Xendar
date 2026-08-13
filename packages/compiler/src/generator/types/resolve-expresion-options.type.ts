/**
 * Options for resolving an expression during code generation.
 */
export type ResolveExpressionOptions = { 
  /**
   * If `true`, skips the resolution step and emits the expression as-is.
   */
  skipResolution?: boolean, 
  /**
   * The name of the resolver function to use for resolving the expression.
   */
  resolver?: string 
}