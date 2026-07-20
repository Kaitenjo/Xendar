import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks a text or interpolation node.
 *
 * Plain text nodes carry no expression, so they produce no lines. An
 * interpolation's expression is emitted as a bare statement — enough for
 * TS to validate it, with no name needing to be bound to the result.
 */
export function typeCheckTextAndInterpolation(node: TextNode | InterpolationNode, _processNode: ProcessNode): string[] {
  return node.type === ASTNodeType.Interpolation
    ? [`${resolveExpression(node.expression, { resolver: 'root' })};`]
    : [];
}