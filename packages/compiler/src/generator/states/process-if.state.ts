import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for an `@if` conditional node.
 * Emits an `_if(...)` call wrapping the resolved condition blocks.
 *
 * @param node - The `IfNode` to process.
 * @param index - Base variable name prefix for child nodes.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - Current render scope context.
 * @returns An object with the main block code lines and a map of helper functions to register.
 */
export function processIf(node: IfNode, parentNode: string, index: string, compilerContext: CompilerContext): GeneratorTransitionFunctionReturnType {
  const ifContext = new CompilerContext([], compilerContext);
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  };

  retVal.code.push(`_if(${parentNode}, context, [`);
  const ifKey = getBlockIdentifier('if', parentNode, index);
  retVal.code.push(
    ...indent([
      '{',
      ...indent([`condition: () => ${node.condition.toString()},`, `block: this.${ifKey}.bind(this)`]),
      '},'
    ])
  );
  retVal.functionsToProcess!.set(ifKey, { fn: { node, parentNode, context: ifContext }, args: [parentNode, 'parentContext'] });

  let alt = node.alternate;
  let i = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new CompilerContext([], compilerContext);
    const keyElseIf = getBlockIdentifier('elseIf', parentNode, `${index}_${i}`);
    const conditionNode = alt.conditionNode;

    retVal.code.push(
      ...indent([
        '{',
        ...indent([`condition: () => ${resolveExpression(conditionNode, compilerContext).toString()},`, `block: this.${keyElseIf}.bind(this)`]),
        '},'
      ])
    );
    
    retVal.functionsToProcess!.set(keyElseIf, { fn: { node: alt, parentNode, context: elseIfContext }, args: [parentNode, 'parentContext'] });
    alt = alt.alternate;
    i++;
  }

  if (alt) {
    const elseContext = new CompilerContext([], compilerContext);
    const keyElse = getBlockIdentifier('else', parentNode, index);
    retVal.code.push(
      ...indent([
        '{',
        ...indent([`block: this.${keyElse}.bind(this)`]),
        '},'
      ])
    );
    retVal.functionsToProcess!.set(keyElse, { fn: { node: alt, parentNode, context: elseContext }, args: [parentNode, 'parentContext'] });
  }

  retVal.code.push(']);');
  return retVal
}