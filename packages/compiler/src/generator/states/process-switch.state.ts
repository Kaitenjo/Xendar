import { indent } from '@xaendar/common';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a `@switch` node.
 * Emits a `_switch(...)` call that delegates to the reactive `_switch` runtime utility.
 *
 * @param node - The `SwitchNode` to process.
 * @param index - Base variable name prefix for child nodes.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - Current render scope context.
 * @returns An object with the main block code lines and a map of helper functions to register.
 */
export function processSwitch(node: SwitchNode, parentNode: string, index: string, compilerContext: CompilerContext): GeneratorTransitionFunctionReturnType {
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  retVal.code.push(`_switch(${parentNode}, context, () => ${resolveExpression(node.expression, compilerContext)}, [`);

  node.children.forEach((caseNode, i) => {
    const caseContext = new CompilerContext([], compilerContext);
    const caseName = caseNode.condition ? getBlockIdentifier('case', parentNode, `${index}_${i}`) : getBlockIdentifier('default', parentNode, index);

    retVal.functionsToProcess!.set(caseName, {
      fn: { node: caseNode, parentNode, context: caseContext },
      args: [parentNode, 'parentContext']
    });

    const fnName = `this.${caseName}.bind(this)`;
    retVal.code.push(
      '{',
      ...indent([`condition: ${caseNode.condition ? `[${caseNode.condition.join(', ')}]` : `null`},`, `block: ${fnName}`]),
      '},'
    );
  });

  retVal.code.push('])');
  return retVal;
}
