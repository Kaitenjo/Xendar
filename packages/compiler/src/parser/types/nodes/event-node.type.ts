import { InterpolationNode } from './interpolation-node.type';

/**
 * AST node representing a DOM event binding on an element.
 */
export type EventNode = {
  /**
   * The DOM event name (e.g. `click`, `input`).
   */
  name: string;
  /**
   * The event handler, either a method name string or an interpolation node.
   */
  handler: string | InterpolationNode;
}
