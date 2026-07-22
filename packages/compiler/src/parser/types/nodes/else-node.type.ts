import { ASTNodeType } from '../node.enum';
import { ASTNodeKind } from '../ast.type';

/**
 * AST node representing an `@else` branch attached to an `@if` node.
 */
export type ElseNode = {
  /**
   * Discriminant identifying this node as an else branch.
   */
  type: ASTNodeType.Else;
  /**
   * Child nodes rendered when the `@if` condition is false.
   */
  children: ASTNodeKind[];
}
