import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { ElseIfNode } from '../../parser/types/nodes/else-if-node.type';
import { ElseNode } from '../../parser/types/nodes/else-node.type';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { Context } from '../models/render-context.model';
import { processNode } from '../render-generator';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';
import { NoArgsFunction, NoArgsVoidFunction } from '@xaendar/types';

/**
 * Generates code for an `@if` conditional node.
 * Emits an `if (...) { ... }` block, appending an `else { ... }` block if an alternate exists.
 *
 * @param node The `IfNode` to process.
 * @param nodeName Base variable name prefix for child nodes.
 * @param parentNode Variable name of the parent DOM node.
 * @param context Current render scope context.
 * @returns Array of generated code lines.
 */
export function processIf(node: IfNode, nodeName: string, parentNode: string, context: Context): { mainBlock: string[], fns: Map<string, string[]> } {
  const ifContext = new Context([], context);
  const functionsToProcess = new Map<string, string[]>();
  const mainBlock = new Array<{ condition?: string, block: string }>();

  const ifKey = getBlockIdentifier(parentNode, nodeName, 'if');
  mainBlock.push({
    condition: resolveExpression(node.conditionNode, context),
    block: `this.${ifKey}.bind(this)`
  }
  );
  functionsToProcess.set(ifKey, processConsequent(node, nodeName, parentNode, ifContext));

  let alt = node.alternate;
  let index = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new Context([], context);
    const keyElseIf = getBlockIdentifier(parentNode, `${nodeName}_${index}`, 'elseIf');
    const conditionNode = alt.conditionNode;

    mainBlock.push({
      condition: resolveExpression(conditionNode, context),
      block: `this.${keyElseIf}.bind(this)`
    });
    functionsToProcess.set(keyElseIf, processConsequent(alt, nodeName, parentNode, elseIfContext));
    alt = alt.alternate;
  }

  if (alt) {
    const elseContext = new Context([], context);
    const keyElse = getBlockIdentifier(parentNode, nodeName, 'else');
    mainBlock.push({
      block: `this.${keyElse}.bind(this)`
    });

    functionsToProcess.set(keyElse, processConsequent(alt, nodeName, parentNode, elseContext));
  }

  return {
    mainBlock: [
      '_if(unwatchFns, [',
      ...indent(mainBlock.map(({ condition, block }) => {
        return [
          '{',
          ...indent(condition 
            ? [`condition: ${condition.toString()},`, `block: ${block.toString()}`] 
            : [`block: ${block.toString()}`]),
          '},'
        ]
      }).flat()),
      '])',
    ],
    fns: functionsToProcess
  };
}

function processConsequent(node: IfNode | ElseIfNode | ElseNode, nodeName: string, parentNode: string, context: Context): string[] {
  return node.consequent.map((child, i) => processNode(child, `${nodeName}_${i}`, parentNode, context)).flat();
}
