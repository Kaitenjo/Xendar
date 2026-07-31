import { indent } from '@xaendar/common';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks a `@switch` block using a real TypeScript `switch` statement.
 *
 * This drops the previous `const case_0: typeof switchExpr = 'literal';`
 * trick entirely: a real `switch (expr) { case 'literal': ... }` already
 * makes TS validate that each case value is assignable to the switch
 * expression's type as part of ordinary switch-statement semantics — and,
 * as a bonus, narrows the switch expression's type inside each case block
 * (e.g. from a `'loading' | 'error' | 'idle'` union down to just
 * `'loading'`), which the previous approach never provided.
 *
 * Multiple case labels that shared one body in the AST (fallthrough) are
 * emitted as stacked `case` labels sharing that same body, matching real
 * JS/TS fallthrough syntax directly.
 */
export function typeCheckSwitch(node: SwitchNode, processNode: ProcessNode, context: TypeCheckContext): string[] {
  const expression = resolveExpression(node.expression, context, { resolver: 'root' });
  const lines = [`switch (${expression}) {`];

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const caseNode = children[i];
    const conditions = caseNode.condition;
    if (conditions?.length) {
      for (let j = 0; j < conditions.length; j++) {
        lines.push(`  case ${conditions[j]}:`)
      }
    } else {
      lines.push('  default:');
    }

    lines.push(...indent(
      indent([
        ...caseNode.children.flatMap(child => processNode(child, context)),
        'break;',
      ])));
  }

  lines.push('}');

  return lines;
}