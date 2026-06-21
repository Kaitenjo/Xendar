import { indent } from '@xaendar/common';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { processNode } from '../render-generator';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';
import { CompilerContext } from '../models/compiler-context.model';

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
export function processSwitch(node: SwitchNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): { mainBlock: string[], fns: Map<string, { code: string[], args: [parentElement: string, parentContext: string] }> } {
  const functionsToProcess = new Map<string, { code: string[], args: [parentElement: string, parentContext: string] }>();
  const blocks = new Array<{ condition: string[] | null, block: string }>();

  node.cases.forEach((caseNode, i) => {
    const caseContext = new CompilerContext([], compilerContext);
    const caseName = caseNode.condition ? getBlockIdentifier(parentNode, `${nodeName}_${i}`, 'case') : getBlockIdentifier(parentNode, nodeName, 'default');

    functionsToProcess.set(caseName, { code: caseNode.children.map((child, i) => processNode(child, `${nodeName}_${i}_${i}`, parentNode, caseContext)).flat(), args: [parentNode, 'parentContext'] });
    blocks.push({
      condition: caseNode.condition,
      block: `this.${caseName}.bind(this)`
    });
  });

  return {
    mainBlock: [
      `_switch(${parentNode}, context, () => ${resolveExpression(node.expression, compilerContext)}, [`,
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
