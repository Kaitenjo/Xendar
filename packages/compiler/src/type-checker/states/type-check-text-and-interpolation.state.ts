import { CompilerContext } from '../../generator/models/compiler-context.model';
import { getTextIdentifier, resolveExpression } from '../../generator/utils/generator.utils';
import { ASTNodeType } from '../../parser/types/node.enum';
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type';
import { TextNode } from '../../parser/types/nodes/text-node.type';
import { TypeCheckerTransitionFunctionReturnType } from '../types/type-checker-transition-function-return-type.type';


export function typeCheckTextAndInterpolation(node: TextNode | InterpolationNode, parentNode: { identifier: string, type: string }, index: string, compilerContext: CompilerContext): TypeCheckerTransitionFunctionReturnType {
  return {
    code: [`const ${getTextIdentifier('text', parentNode.identifier, index)} = ${node.type === ASTNodeType.Text ? `'${node.value}'` : resolveExpression(node.expression, compilerContext, { resolver: 'root' })};`]
  };
}
