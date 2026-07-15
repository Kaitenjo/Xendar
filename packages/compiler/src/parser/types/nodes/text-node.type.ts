import { ASTNodeType } from '../node.enum';

/**
 * AST node representing a run of plain text content.
 */
export type TextNode = {
  /**
   * Discriminant identifying this node as plain text.
   */
  type: ASTNodeType.Text
  /**
   * The text content string.
   */
  value: string;
}
