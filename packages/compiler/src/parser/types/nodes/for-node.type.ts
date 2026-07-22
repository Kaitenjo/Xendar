import { ASTNodeType } from '../node.enum';
import { ASTNodeKind } from '../ast.type';
import { ForExpression } from '../for-expression.type';

/**
 * AST node representing an `@for` iteration directive.
 */
export type ForNode = ForExpression & {
  /**
   * Discriminant identifying this node as a for loop.
   */
  type: ASTNodeType.For;
  /**
   * Child nodes rendered for each iteration.
   */
  children: ASTNodeKind[];
}
