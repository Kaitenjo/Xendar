/**
 * Options for resolving an expression during code generation.
 *
 * @property skipResolution - If `true`, skips the resolution step and emits the expression as-is.
 * @property resolver - The name of the resolver function to use for resolving the expression.
 */
export type ResolveExpressionOptions = { skipResolution?: boolean, resolver?: string }