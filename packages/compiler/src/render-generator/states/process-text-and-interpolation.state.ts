import { Identifier } from 'typescript';
import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';

/**
 * Generates code for a text or interpolation node.
 * Creates a DOM text node with either a JSON-stringified literal or a resolved expression,
 * then appends it to the parent DOM node.
 *
 * @param node A `TextNode` or `InterpolationNode` to process.
 * @param parentNode Variable name of the parent DOM node.
 * @returns Array of two generated code lines: the text node creation and the appendChild call.
 */
export function processTextAndInterpolation(node: TextNode | InterpolationNode, parentNode: string): string[] {
  return [
    node.type === ASTNodeType.Text 
      ? `renderLiteralText(${parentNode}, '${node.value}')`
      : `renderText(${parentNode}, '${(node.expression as Identifier).text}', context)`

  ];
}
