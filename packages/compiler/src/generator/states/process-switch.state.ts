import { indent } from '@xaendar/common';
import { Function } from '@xaendar/types';
import { ASTNode } from '../../parser/types/ast.type';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a `@switch` node.
 * Emits a `_switch(...)` call that delegates to the reactive `_switch` runtime utility.
 *
 * @param node - The `SwitchNode` to process.
 * @param nodeName - Base variable name prefix for child nodes.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - Current render scope context.
 * @returns An object with the main block code lines and a map of helper functions to register.
 */
export function processSwitch(node: SwitchNode, nodeName: string, parentNode: string, compilerContext: CompilerContext, processNode: Function<[ASTNode, string, string, CompilerContext, Function], string[]>): GeneratorTransitionFunctionReturnType {
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  retVal.code.push(`_switch(${parentNode}, context, () => ${resolveExpression(node.expression, compilerContext)}, [`);

  node.cases.forEach((caseNode, i) => {
    const caseContext = new CompilerContext([], compilerContext);
    const caseName = caseNode.condition ? getBlockIdentifier(parentNode, `${nodeName}_${i}`, 'case') : getBlockIdentifier(parentNode, nodeName, 'default');

    retVal.functionsToProcess!.set(caseName, {
      fn: caseNode.children.map((child, i) => processNode(child, `${nodeName}_${i}_${i}`, parentNode, caseContext, processNode)).flat(),
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
