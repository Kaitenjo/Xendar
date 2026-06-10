import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer consumes a `@const name = expression;` declaration.
 */
export type ConstDeclarationToken = {
  /**
   * Discriminant identifying this token as a const declaration.
   */
  type: TokenType.CONST_DECLARATION,
  /**
   * `parts[0]` is the variable name; `parts[1]` is the initializer expression.
   */
  parts: [string, string]
}
