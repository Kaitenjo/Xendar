import { ConstDeclarationNode } from '../../parser/types/nodes/const-declaration-node.type';
import { Context } from '../models/render-context.model';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a `@const` declaration node.
 * Emits a `const name = expression;` JavaScript statement.
 *
 * @param node The `ConstDeclarationNode` to process.
 * @param _nodeName Unused node name.
 * @param _parentNode Unused parent node name.
 * @param _context Unused render context.
 * @returns Array containing the generated const statement string.
 */
export function processConstDeclaration(node: ConstDeclarationNode, _nodeName: string, _parentNode: string, context: Context): string[] {
  context.addIdentifier(node.varName);
  
  return [
    `const ${node.varName} = ${resolveExpression(node.expression, context)};`
  ];
}
