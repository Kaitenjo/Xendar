import { Expression } from 'typescript';
import { ASTNodeType } from '../node.enum.js';

/**
 * AST node representing a `@const name = expression;` template-level constant declaration.
 */
export type ConstDeclarationNode = {
  /**
   * Discriminant identifying this node as a const declaration.
   */
  type: ASTNodeType.ConstDeclaration;
  /**
   * The declared variable name.
   */
  varName: string;
  /**
   * The initializer expression string.
   */
  expression: Expression;
}
