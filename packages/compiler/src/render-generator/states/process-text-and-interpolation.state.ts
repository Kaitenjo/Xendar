import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a text or interpolation node.
 *
 * Emits a `_renderLiteralText` call for plain text nodes and a
 * `_renderText` call for interpolation nodes, both appending a DOM text
 * node to the parent.
 *
 * @param node - A `TextNode` or `InterpolationNode` to process.
 * @param parentNode - Variable name of the parent DOM node to append to.
 * @returns Array of generated code lines.
 */
export function processTextAndInterpolation(node: TextNode | InterpolationNode, parentNode: string, compilerContext: CompilerContext): string[] {
  return [`${node.type === ASTNodeType.Text 
      ? `_renderLiteralText(${parentNode}, context, '${node.value}')`
      : `_renderText(${parentNode}, context, () => ${resolveExpression(node.expression, compilerContext)})`
    }`,
  ];
}
