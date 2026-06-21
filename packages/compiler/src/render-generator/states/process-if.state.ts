import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { ElseIfNode } from '../../parser/types/nodes/else-if-node.type';
import { ElseNode } from '../../parser/types/nodes/else-node.type';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { processNode } from '../render-generator';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';
import { CompilerContext } from '../models/compiler-context.model';

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
export function processIf(node: IfNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): { mainBlock: string[], fns: Map<string, { code: string[], args: [parentElement: string, parentContext: string] }> } {
  const ifContext = new CompilerContext([], compilerContext);
  const functionsToProcess = new Map<string, { code: string[], args: [parentElement: string, parentContext: string] }>();
  const mainBlock = new Array<{ condition?: string, block: string }>();

  const ifKey = getBlockIdentifier(parentNode, nodeName, 'if');
  mainBlock.push({
    condition: resolveExpression(node.conditionNode, compilerContext),
    block: `this.${ifKey}.bind(this)`
  }
  );
  functionsToProcess.set(ifKey, { code: processConsequent(node, nodeName, parentNode, ifContext), args: [parentNode, 'parentContext'] });

  let alt = node.alternate;
  let index = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new CompilerContext([], compilerContext);
    const keyElseIf = getBlockIdentifier(parentNode, `${nodeName}_${index}`, 'elseIf');
    const conditionNode = alt.conditionNode;

    mainBlock.push({
      condition: resolveExpression(conditionNode, compilerContext),
      block: `this.${keyElseIf}.bind(this)`
    });
    functionsToProcess.set(keyElseIf, { code: processConsequent(alt, nodeName, parentNode, elseIfContext), args: [parentNode, 'parentContext'] });
    alt = alt.alternate;
  }

  if (alt) {
    const elseContext = new CompilerContext([], compilerContext);
    const keyElse = getBlockIdentifier(parentNode, nodeName, 'else');
    mainBlock.push({
      block: `this.${keyElse}.bind(this)`
    });

    functionsToProcess.set(keyElse, { code: processConsequent(alt, nodeName, parentNode, elseContext), args: [parentNode, 'parentContext'] });
  }

  return {
    mainBlock: [
      `_if(${parentNode}, context, [`,
      ...indent(mainBlock.map(({ condition, block }) => {
        return [
          '{',
          ...indent(condition 
            ? [`condition: () => ${condition.toString()},`, `block: ${block.toString()}`] 
            : [`block: ${block.toString()}`]),
          '},'
        ]
      }).flat()),
      '])',
    ],
    fns: functionsToProcess
  };
}

function processConsequent(node: IfNode | ElseIfNode | ElseNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): string[] {
  return node.consequent.map((child, i) => processNode(child, `${nodeName}_${i}`, parentNode, compilerContext)).flat();
}
