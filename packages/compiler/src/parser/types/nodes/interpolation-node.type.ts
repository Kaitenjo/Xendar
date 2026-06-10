import { Expression } from 'typescript';
import { ASTNodeType } from '../node.enum';

/**
 * AST node representing an inline interpolation binding `{ expression }` or `` {`literal`} ``.
 */
export type InterpolationNode = {
  /**
   * Discriminant identifying this node as an interpolation.
   */
  type: ASTNodeType.Interpolation
  /**
   * The interpolated JavaScript expression string.
   */
  expression: Expression;
}
