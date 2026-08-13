import { ASTNode, ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';
import { AttributeNode } from './attribute-node.type';
import { EventNode } from './event-node.type';

/**
 * AST node representing an HTML element with a tag name, attributes, events, and children.
 */
export type ElementNode = ASTNodeWithSpan<{
  /**
   * Discriminant identifying this node as an element.
   */
  type: ASTNodeType.Element
  /**
   * The HTML tag name of the element.
   */
  tagName: string;
  /**
   * Attribute nodes bound to this element.
   */
  attributes: AttributeNode[];
  /**
   * Event binding nodes attached to this element.
   */
  events: EventNode[];
  /**
   * Child AST nodes nested inside this element.
   */
  children: ASTNode[];
}>
