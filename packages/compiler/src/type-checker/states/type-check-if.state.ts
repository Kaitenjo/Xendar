import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { TypeCheckerTransitionFunctionReturnType } from '../types/type-checker-transition-function-return-type.type';
import { CompilerContext } from '../../generator/models/compiler-context.model';
import { getBlockIdentifier, resolveExpression } from '../../generator/utils/generator.utils';

export function typeCheckIf(node: IfNode, parentNode: { identifier: string, type: string }, index: string, compilerContext: CompilerContext): TypeCheckerTransitionFunctionReturnType {
  const ifContext = new CompilerContext([], compilerContext);
  const retVal: TypeCheckerTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  };

  const ifKey = getBlockIdentifier('if', parentNode.identifier, index);
  retVal.code.push(`const ${ifKey} = ${resolveExpression(node.conditionNode, compilerContext, { resolver: 'root' })};`);

  retVal.functionsToProcess!.set(ifKey, {
    fn: { node, parentNode, context: ifContext }
  });

  let alt = node.alternate;
  let i = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new CompilerContext([], compilerContext);
    const keyElseIf = getBlockIdentifier('elseIf', parentNode.identifier, `${index}_${i}`);
    const conditionNode = alt.conditionNode;

    retVal.code.push(`const ${keyElseIf} = ${resolveExpression(conditionNode, compilerContext, { resolver: 'root' })};`);

    retVal.functionsToProcess!.set(keyElseIf, {
      fn: { node: alt, parentNode, context: elseIfContext }
    });
    alt = alt.alternate;
    i++;
  }

  if (alt) {
    const elseContext = new CompilerContext([], compilerContext);
    const keyElse = getBlockIdentifier('else', parentNode.identifier, index);
    retVal.functionsToProcess!.set(keyElse, {
      fn: { node: alt, parentNode, context: elseContext }
    });
  }

  return retVal
}