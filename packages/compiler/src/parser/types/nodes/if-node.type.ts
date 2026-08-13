import { Expression } from 'typescript';
import { ASTNode, ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';
import { ElseIfNode } from './else-if-node.type';
import { ElseNode } from './else-node.type';

/**
 * AST node representing an `@if` conditional directive.
 */
export type IfNode = ASTNodeWithSpan<{
  /**
   * Discriminant identifying this node as an if conditional.
   */
  type: ASTNodeType.If;
  /**
   * The condition expression string.
   */
  condition: string;
  /**
   * The parsed condition expression, for use in render code generation.
   */
  conditionNode: Expression
  /**
   * Child nodes rendered when the condition is truthy.
   */
  children: ASTNode[];
  /**
   * Optional `@else` branch, or `null` if no else clause is present.
   */
  alternate: ElseIfNode | ElseNode | null;
}>
