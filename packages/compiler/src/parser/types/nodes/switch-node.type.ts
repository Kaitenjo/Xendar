import { Expression } from 'typescript';
import { ASTNodeType } from '../node.enum';
import { CaseNode } from './case-node.type';

/**
 * AST node representing an `@switch` directive with one or more case branches.
 */
export type SwitchNode = {
  /**
   * Discriminant identifying this node as a switch.
   */
  type: ASTNodeType.Switch;
  /**
   * The switch expression string.
   */
  expression: Expression;
  /**
   * The list of `@case` and `@default` branches.
   */
  cases: CaseNode[];
}
