import { indent } from '@xaendar/common';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { Context } from '../models/render-context.model';
import { processNode } from '../render-generator';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for a `@switch` node.
 * Emits a `switch (expression) { case ...: { ... break; } ... }` block.
 *
 * @param node The `SwitchNode` to process.
 * @param nodeName Base variable name prefix for child nodes.
 * @param parentNode Variable name of the parent DOM node.
 * @param context Current render scope context.
 * @param processNode Recursive node processor function.
 * @returns Array of generated code lines.
 */
export function processSwitch(node: SwitchNode, nodeName: string, parentNode: string, context: Context): { mainBlock: string[], fns: Map<string, string[]> } {
  const mainBlock = new Array<string>;
  const functionsToProcess = new Map<string, string[]>;

  mainBlock.push(`switch (${resolveExpression(node.expression, context)}) {`);

  node.cases.forEach((caseNode, i) => {
    const caseContext = new Context([], context);
    const caseName = caseNode.condition ? `case_${nodeName}_${i}` : `default_${nodeName}`;

    functionsToProcess.set(caseName, caseNode.children.map((child, i) => processNode(child, `${nodeName}_${i}_${i}`, parentNode, caseContext)).flat());
    mainBlock.push(
      ...indent([
        ...(!caseNode.condition ? ['default: {'] : caseNode.condition.map((cond, i, arr) => `case ${cond}:${i === arr.length - 1 ? ' {' : ''}`)),
        ...indent([
          `localUnwatchFns = Signal.subtle.untrack(this.${caseName}.bind(this));`,
          'unwatchFns.push(...localUnwatchFns);',
          'break;'
        ]),
        '}'
      ])
    );
  });

  mainBlock.push('}');

  return {
    mainBlock: [
      '(() => {',
      ...indent([
        'let localUnwatchFns = []',
        'const unwatch = () => {',
        ...indent([
          'unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));',
          'localUnwatchFns?.forEach(fn => fn());',
          'localUnwatchFns = [];'
        ]),
        '}',
        'unwatchFns.push(',
        ...indent([
          'effect(() => {',
          ...indent([
            'unwatch();',
            ...mainBlock
          ]),
          '})',
        ]),
        ');'
      ]),
      '})();',
    ],
    fns: functionsToProcess
  };
}
