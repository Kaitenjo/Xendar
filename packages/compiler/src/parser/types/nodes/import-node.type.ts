import { ASTNodeType } from '../node.enum';

/**
 * AST node representing a `@case` or `@default` branch inside a `@switch` block.
 */
export type ImportNode = {
  /**
   * Discriminant identifying this node as a case.
   */
  type: ASTNodeType.Import;
  
  value: string;

  path: string;
}
