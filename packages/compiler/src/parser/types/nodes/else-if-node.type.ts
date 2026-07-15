import { ASTNodeType } from '../node.enum';
import { IfNode } from './if-node.type';

/**
 * AST node representing an `@else if` conditional directive.
 */
export type ElseIfNode = Omit<IfNode, 'type'> & {
  /**
   * Discriminant identifying this node as an else-if conditional.
   */
  type: ASTNodeType.ElseIf;
}
