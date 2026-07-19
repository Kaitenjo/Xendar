import { CompilerContext } from '../../generator/models/compiler-context.model';
import { getBlockIdentifier, resolveExpression } from '../../generator/utils/generator.utils';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { TypeCheckerTransitionFunctionReturnType } from '../types/type-checker-transition-function-return-type.type';

export function typeCheckSwitch(node: SwitchNode, parentNode: { identifier: string, type: string }, index: string, compilerContext: CompilerContext): TypeCheckerTransitionFunctionReturnType {
  const retVal: TypeCheckerTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  const expression = resolveExpression(node.expression, compilerContext, { resolver: 'root' });
  const keySwitch = getBlockIdentifier('switch', parentNode.identifier, index);
  retVal.code.push(`const ${keySwitch} = ${expression};`);

  node.children.forEach((caseNode, i) => {
    const caseContext = new CompilerContext([], compilerContext);
    const caseKey = caseNode.condition ? getBlockIdentifier('case', parentNode.identifier, `${index}_${i}`) : getBlockIdentifier('default', parentNode.identifier, index);
    
    retVal.functionsToProcess!.set(caseKey, {
      fn: { 
        node: caseNode, 
        parentNode: {
          identifier: caseKey,
          type: 'HTMLElement'
        },
        context: caseContext 
      }
    });

    caseNode.condition?.forEach((condition, i) => retVal.code.push(`const ${caseKey}_${i}: typeof ${expression} = ${condition};`));
  });

  return retVal;
}