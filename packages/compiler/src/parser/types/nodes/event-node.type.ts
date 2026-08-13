import { Expression } from 'typescript';
import { InterpolationNode } from './interpolation-node.type';
import { ASTNodeType } from '../node.enum';
import { ASTNodeWithSpan } from '../ast.type';

/**
 * AST node representing a DOM event binding on an element.
 */
export type EventNode = ASTNodeWithSpan<{

  type: ASTNodeType.Event;
  /**
   * The DOM Event Name (e.g. `click`, `input`).
   */
  name: string;
  /**
   * The Event Handler, either a method name string or an interpolation node.
   */
  handler: string | InterpolationNode;
  /**
   * The Event Handler parameters
   */
  parameters: Expression[]
}>;
