import { indent } from '@xaendar/common';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { Context } from '../models/render-context.model';
import { processNode } from '../render-generator';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a `@switch` node.
 * Emits a `_switch(unwatchFns, () => expression, [...])` call that delegates
 * to the reactive `_switch` runtime utility.
 *
 * @param node The `SwitchNode` to process.
 * @param nodeName Base variable name prefix for child nodes.
 * @param parentNode Variable name of the parent DOM node.
 * @param context Current render scope context.
 * @returns Array of generated code lines.
 */
export function processSwitch(node: SwitchNode, nodeName: string, parentNode: string, context: Context): { mainBlock: string[], fns: Map<string, string[]> } {
  const functionsToProcess = new Map<string, string[]>;
  const blocks = new Array<{ condition: string[] | null, block: string }>();

  node.cases.forEach((caseNode, i) => {
    const caseContext = new Context([], context);
    const caseName = caseNode.condition ? getBlockIdentifier(parentNode, `${nodeName}_${i}`, 'case') : getBlockIdentifier(parentNode, nodeName, 'default');

    functionsToProcess.set(caseName, caseNode.children.map((child, i) => processNode(child, `${nodeName}_${i}_${i}`, parentNode, caseContext)).flat());
    blocks.push({
      condition: caseNode.condition,
      block: `this.${caseName}.bind(this)`
    });
  });

  return {
    mainBlock: [
      `_switch(unwatchFns, () => ${resolveExpression(node.expression, context)}, [`,
      ...indent(blocks.map(({ condition, block }) => {
        return [
          '{',
          ...indent(condition
            ? [`condition: [${condition.join(', ')}],`, `block: ${block}`]
            : [`condition: null,`, `block: ${block}`]),
          '},'
        ]
      }).flat()),
      '])',
    ],
    fns: functionsToProcess
  };
}
