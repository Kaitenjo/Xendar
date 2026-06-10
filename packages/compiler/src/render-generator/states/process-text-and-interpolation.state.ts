import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';
import { Context } from '../models/render-context.model';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a text or interpolation node.
 * Creates a DOM text node with either a JSON-stringified literal or a resolved expression,
 * then appends it to the parent DOM node.
 *
 * @param node A `TextNode` or `InterpolationNode` to process.
 * @param nodeName Variable name for the created text node.
 * @param parentNode Variable name of the parent DOM node.
 * @param _context Unused render context.
 * @returns Array of two generated code lines: the text node creation and the appendChild call.
 */
export function processTextAndInterpolation(node: TextNode | InterpolationNode, nodeName: string, parentNode: string, context: Context): string[] {
  const textValue = node.type === ASTNodeType.Text ? JSON.stringify(node.value) : resolveExpression(node.expression, context);

  return [
    `const ${nodeName} = document.createTextNode(${textValue});`,
    `${parentNode}.appendChild(${nodeName});`,
    `unwatchFns.push(effect(() => ${nodeName}.textContent = ${textValue}));`
  ];
}
