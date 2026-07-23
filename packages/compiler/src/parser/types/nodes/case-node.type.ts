import { ASTNode, ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';

/**
 * AST node representing a `@case` or `@default` branch inside a `@switch` block.
 */
export type CaseNode = ASTNodeWithSpan<{
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
  children: ASTNode[];
}>
