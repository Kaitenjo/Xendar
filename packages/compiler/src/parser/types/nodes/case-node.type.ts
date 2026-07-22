import { ASTNodeType } from '../node.enum';
import { ASTNodeKind } from '../ast.type';

/**
 * AST node representing a `@case` or `@default` branch inside a `@switch` block.
 */
export type CaseNode = {
  /**
   * Discriminant identifying this node as a case.
   */
  type: ASTNodeType.Case;
  /**
   * The case condition expression, or `null` for a `@default` branch.
   */
  condition: string[] | null; // null = @default
  /**
   * Child nodes rendered when this case matches.
   */
  children: ASTNodeKind[];
}
