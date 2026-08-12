import { resolveExpression } from '../../generator/utils/generator.utils';
import { SwitchNode } from '../../parser/types/nodes/switch-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { indentLines, line, mapped, plain } from '../utils/line-builder.utils';

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
export function typeCheckSwitch(node: SwitchNode, processNode: ProcessNode, context: TypeCheckContext): Line[] {
  const expression = resolveExpression(node.expression, context, { resolver: 'root' });
  const lines = [line('switch (', mapped(expression, node.span), ') {')];

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const caseNode = children[i];
    const conditions = caseNode.condition;
    if (conditions?.length) {
      for (let j = 0; j < conditions.length; j++) {
        // Se in futuro ogni condizione porta un proprio span (fallthrough
        // con provenienze diverse), sostituisci con:
        // line('  case ', mapped(conditions[j], conditionSpans[j]), ':')
        lines.push(plain(`  case ${conditions[j]}:`));
      }
    } else {
      lines.push(plain('  default:'));
    }

    lines.push(...indentLines(
      indentLines([
        ...caseNode.children.flatMap(child => processNode(child, context)),
        plain('break;'),
      ])));
  }

  lines.push(plain('}'));

  return lines;
}