import { resolveExpression } from '../../generator/utils/generator.utils';
import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { line, mapped } from '../utils/line-builder.utils';

/**
 * Type-checks a text or interpolation node.
 *
 * Plain text nodes carry no expression, so they produce no lines. An
 * interpolation's expression is emitted as a bare statement — enough for
 * TS to validate it, with no name needing to be bound to the result.
 */
export function typeCheckTextAndInterpolation(node: TextNode | InterpolationNode, _processNode: ProcessNode, context: TypeCheckContext): Line[] {
  return node.type === ASTNodeType.Interpolation
    ? [line(mapped(`${resolveExpression(node.expression, context, { resolver: 'root' }).expression};`, node.span))]
    : [];
}