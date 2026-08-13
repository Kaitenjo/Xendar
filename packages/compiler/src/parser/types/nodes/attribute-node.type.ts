import { ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';
import { InterpolationNode } from './interpolation-node.type';

/**
 * AST node representing an HTML attribute on an element.
 */
export type AttributeNode = ASTNodeWithSpan<{
  type: ASTNodeType.Attribute
  /**
   * The attribute name.
   */
  name: string;
  /**
   * The attribute value, either a plain string or an interpolation node.
   */
  value: string | InterpolationNode;
}>
