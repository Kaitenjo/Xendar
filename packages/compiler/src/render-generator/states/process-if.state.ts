import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { ElseIfNode } from '../../parser/types/nodes/else-if-node.type';
import { ElseNode } from '../../parser/types/nodes/else-node.type';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { Context } from '../models/render-context.model';
import { processNode } from '../render-generator';
import { resolveExpression } from '../utils/render-generator.utils';

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
  const functionsToProcess = new Map<string, string[]>;
  const mainBlock = new Array<string>;

  const ifKey = `if_${nodeName}`;
  mainBlock.push(
    `if (${resolveExpression(node.conditionNode, context)}) {`,
    indent(`checkAndUpdateState(0, this.${ifKey}.bind(this));`),
    '}'
  );
  functionsToProcess.set(ifKey, processConsequent(node, nodeName, parentNode, ifContext));

  let alt = node.alternate;
  let index = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new Context([], context);

    const keyElseIf = `elseIf_${nodeName}_${index}`;
    mainBlock[mainBlock.length - 1] += ` else if (${resolveExpression(alt.conditionNode, context)}) {`;
    mainBlock.push(
      indent(`checkAndUpdateState(${++index}, this.${keyElseIf}.bind(this));`),
      '}'
    );
    functionsToProcess.set(keyElseIf, processConsequent(alt, nodeName, parentNode, elseIfContext));
    alt = alt.alternate;
  }

  if (alt) {
    const elseContext = new Context([], context);
    const keyElse = `else_${nodeName}`;
    mainBlock[mainBlock.length - 1] += ' else {';
    mainBlock.push(
      indent(`checkAndUpdateState(${++index}, this.${keyElse}.bind(this));`),
      '}'
    );

    functionsToProcess.set(keyElse, processConsequent(alt, nodeName, parentNode, elseContext));
  }

  return {
    mainBlock: [
      '(() => {',
      ...indent([
        'let state;',
        'let localUnwatchFns = []',
        'const checkAndUpdateState = (newState, fn) => {',
        ...indent([
          'if (state === newState) {',
          indent('return;'),
          '}',
          'state = newState;',
          'unwatch();',
          'localUnwatchFns = Signal.subtle.untrack(fn);',
          'unwatchFns.push(...localUnwatchFns);'
        ]),
        '};',
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
          ...indent(mainBlock),
          '})',
        ]),
        ');'
      ]),
      '})();',
    ],
    fns: functionsToProcess
  };
}

function processConsequent(node: IfNode | ElseIfNode | ElseNode, nodeName: string, parentNode: string, context: Context): string[] {
  return node.consequent.map((child, i) => processNode(child, `${nodeName}_${i}`, parentNode, context)).flat();
}
