import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { ElseIfNode } from '../../parser/types/nodes/else-if-node.type';
import { ElseNode } from '../../parser/types/nodes/else-node.type';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';
import { Function } from '@xaendar/types';
import { ASTNode } from '../../parser/types/ast.type';

/**
 * Generates code for an `@if` conditional node.
 * Emits an `_if(...)` call wrapping the resolved condition blocks.
 *
 * @param node - The `IfNode` to process.
 * @param nodeName - Base variable name prefix for child nodes.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - Current render scope context.
 * @returns An object with the main block code lines and a map of helper functions to register.
 */
export function processIf(node: IfNode, nodeName: string, parentNode: string, compilerContext: CompilerContext, processNode: Function<[ASTNode, string, string, CompilerContext, Function], GeneratorTransitionFunctionReturnType>): GeneratorTransitionFunctionReturnType {
  const ifContext = new CompilerContext([], compilerContext);
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  };

  retVal.code.push(`_if(${parentNode}, context, [`);
  const ifKey = getBlockIdentifier(parentNode, nodeName, 'if');
  retVal.code.push(
    '{',
    ...indent([`condition: () => ${node.condition.toString()},`, `block: this.${ifKey}.bind(this)`]),
    '},'
  );
  retVal.functionsToProcess!.set(ifKey, { fn: processConsequent(node, nodeName, parentNode, ifContext, processNode), args: [parentNode, 'parentContext'] });

  let alt = node.alternate;
  let index = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new CompilerContext([], compilerContext);
    const keyElseIf = getBlockIdentifier(parentNode, `${nodeName}_${index}`, 'elseIf');
    const conditionNode = alt.conditionNode;

    retVal.code.push(
      '{',
      ...indent([`condition: () => ${resolveExpression(conditionNode, compilerContext).toString()},`, `block: this.${keyElseIf}.bind(this)`]),
      '},'
    );

    retVal.functionsToProcess!.set(keyElseIf, { fn: processConsequent(alt, nodeName, parentNode, elseIfContext, processNode), args: [parentNode, 'parentContext'] });
    alt = alt.alternate;
  }

  if (alt) {
    const elseContext = new CompilerContext([], compilerContext);
    const keyElse = getBlockIdentifier(parentNode, nodeName, 'else');
    retVal.code.push(
      '{',
      ...indent([`block: this.${keyElse}.bind(this)}`]),
      '},'
    );
    retVal.functionsToProcess!.set(keyElse, { fn: processConsequent(alt, nodeName, parentNode, elseContext, processNode), args: [parentNode, 'parentContext'] });
  }

  retVal.code.push('])');
  return retVal
}

function processConsequent(node: IfNode | ElseIfNode | ElseNode, nodeName: string, parentNode: string, compilerContext: CompilerContext, processNode: Function<[ASTNode, string, string, CompilerContext, Function], GeneratorTransitionFunctionReturnType>): string[] {
  return node.consequent.map((child, i) => processNode(child, `${nodeName}_${i}`, parentNode, compilerContext, processNode).code).flat();
}
