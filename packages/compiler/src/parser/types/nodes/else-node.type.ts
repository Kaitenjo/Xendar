import { ASTNode, ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';

/**
 * AST node representing an `@else` branch attached to an `@if` node.
 */
export type ElseNode = ASTNodeWithSpan<{
  /**
   * Discriminant identifying this node as an else branch.
   */
  type: ASTNodeType.Else;
  /**
   * Child nodes rendered when the `@if` condition is false.
   */
  children: ASTNode[];
}>
